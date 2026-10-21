import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label?: string;
  count?: number;
}

interface MultiSelectFilterDropdownProps {
  id: string;
  label: string;
  singularLabel?: string;
  pluralLabel?: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  totalEntitiesCount?: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  searchPlaceholder?: string;
  helpPopup?: React.ReactNode;
  allSelectedDisplayText?: string;
  allSelectedLabel?: string;
}

export const MultiSelectFilterDropdown: React.FC<MultiSelectFilterDropdownProps> = ({
  id,
  label,
  singularLabel,
  pluralLabel,
  options,
  selectedValues,
  onChange,
  totalEntitiesCount,
  isOpen,
  onToggle,
  onClose,
  searchPlaceholder,
  helpPopup,
  allSelectedDisplayText,
  allSelectedLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const singular = singularLabel || label.toLowerCase();
  const plural = pluralLabel || `${label.toLowerCase()}s`;

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Map of option values to their label and count
  const optionMap = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    options.forEach(opt => {
      map.set(opt.value, {
        label: opt.label || opt.value,
        count: opt.count ?? 0,
      });
    });
    return map;
  }, [options]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }
    const q = searchQuery.toLowerCase().trim();
    return options.filter(opt => {
      const text = (opt.label || opt.value).toLowerCase();
      return text.includes(q);
    });
  }, [options, searchQuery]);

  const handleToggleValue = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAllVisible = () => {
    const visibleVals = filteredOptions.map(o => o.value);
    const merged = new Set([...selectedValues, ...visibleVals]);
    onChange(Array.from(merged));
  };

  const handleClearAll = () => {
    onChange([]);
    setSearchQuery('');
  };

  const isAllSelected = options.length > 0 && selectedValues.length === options.length;

  // Determine button trigger display text
  const buttonDisplayText = useMemo(() => {
    if (isAllSelected && allSelectedDisplayText) {
      return allSelectedDisplayText;
    }
    if (selectedValues.length === 0) {
      if (allSelectedDisplayText) {
        return `No ${plural} selected`;
      }
      return `All ${plural} (${options.length})`;
    }
    if (selectedValues.length === 1) {
      const val = selectedValues[0];
      const info = optionMap.get(val);
      const optLabel = info ? info.label : val;
      const count = info ? info.count : 0;
      return `${optLabel} (${count})`;
    }
    if (selectedValues.length === options.length && allSelectedDisplayText) {
      return allSelectedDisplayText;
    }
    return `${selectedValues.length} ${plural} selected`;
  }, [isAllSelected, allSelectedDisplayText, selectedValues, options.length, plural, optionMap]);

  return (
    <div
      ref={containerRef}
      className={`space-y-1 relative ${isOpen ? 'z-40' : 'z-0'}`}
      id={`multi-select-filter-${id}`}
    >
      {/* Header with Label & Clear Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <label className="text-[10px] font-technical uppercase text-[#6B7280]">
            {label}
          </label>
          {helpPopup}
        </div>
        {selectedValues.length > 0 && !isAllSelected && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[10px] text-[#0284C7] hover:underline cursor-pointer"
            title={`Clear ${label} selection`}
          >
            Clear ({selectedValues.length})
          </button>
        )}
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full bg-white border px-2 py-1 rounded-[4px] text-xs font-sans text-left transition-all cursor-pointer flex items-center justify-between shadow-2xs ${
          isOpen
            ? 'border-[#111827] ring-1 ring-[#111827]'
            : selectedValues.length > 0
              ? 'border-[#111827] text-[#111827] font-normal'
              : 'border-[#E5E7EB] text-[#374151] hover:border-[#9CA3AF]'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={`Filter by ${label}`}
      >
        <span className="truncate pr-1">
          {buttonDisplayText}
        </span>
        <div className="flex items-center space-x-1 shrink-0 ml-1 text-[#6B7280]">
          {selectedValues.length > 1 && !isAllSelected && (
            <span className="text-[10px] font-technical bg-[#111827] text-white px-1.5 py-0.2 rounded-[2px] font-normal">
              {selectedValues.length}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 transition-transform" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 transition-transform" />
          )}
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#111827]/25 rounded-[4px] shadow-xl z-50 flex flex-col max-h-72 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header inside dropdown */}
          <div className="p-2 border-b border-[#E5E7EB] bg-[#FAF8F5] shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-2.5 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder={searchPlaceholder || `Search ${plural}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] pl-8 pr-7 py-1 rounded-[4px] text-xs text-[#111827] outline-none placeholder-[#9CA3AF]"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 p-0.5 text-[#8C877F] hover:text-[#111827] cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mt-1.5 text-[10px] font-technical text-[#6B7280]">
              <span>
                {filteredOptions.length} of {options.length} {plural}
              </span>
              <div className="flex items-center space-x-2">
                {selectedValues.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[#DC2626] hover:underline cursor-pointer font-medium"
                  >
                    Clear all
                  </button>
                )}
                {filteredOptions.length > 0 && selectedValues.length < filteredOptions.length && (
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="text-[#0284C7] hover:underline cursor-pointer font-medium"
                  >
                    Select visible
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable List of Options */}
          <div className="overflow-y-auto flex-1 divide-y divide-[#F3F4F6] text-xs">
            {/* "All (No Filter)" or "All Active Relationships (1-6)" row */}
            <button
              type="button"
              onClick={() => {
                if (isAllSelected) {
                  handleClearAll();
                } else {
                  onChange(options.map(o => o.value));
                }
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                isAllSelected || selectedValues.length === 0
                  ? 'bg-[#F3F4F6] text-[#111827] font-normal'
                  : 'text-[#374151] hover:bg-[#FAF8F5]'
              }`}
            >
              <div className="flex items-center space-x-2 truncate pr-2">
                <input
                  type="checkbox"
                  checked={isAllSelected || (selectedValues.length === 0 && !allSelectedDisplayText)}
                  readOnly
                  className="rounded border-[#D1D5DB] text-[#111827] pointer-events-none cursor-pointer"
                />
                <span>{allSelectedLabel || `All ${label} (No Filter)`}</span>
              </div>
              {totalEntitiesCount !== undefined && (
                <span className="text-[10px] font-technical text-[#716C64] shrink-0 ml-1">
                  {totalEntitiesCount}
                </span>
              )}
            </button>

            {/* Empty state */}
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-[11px] text-[#8C877F]">
                No {plural} match "{searchQuery}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt.value);
                const optLabel = opt.label || opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggleValue(opt.value)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                      isChecked
                        ? 'bg-[#F3F4F6] text-[#111827] font-normal'
                        : 'text-[#374151] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded border-[#D1D5DB] text-[#111827] pointer-events-none cursor-pointer"
                      />
                      <span className="truncate" title={optLabel}>
                        {optLabel}
                      </span>
                    </div>
                    {opt.count !== undefined && (
                      <span
                        className={`text-[10px] font-technical px-1.5 py-0.2 rounded-[2px] shrink-0 ml-1 ${
                          isChecked
                            ? 'bg-[#111827] text-white font-normal'
                            : 'bg-[#FAF8F5] text-[#716C64]'
                        }`}
                      >
                        {opt.count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="p-1.5 border-t border-[#E5E7EB] bg-[#FAF8F5] flex items-center justify-between text-[10px] font-technical text-[#6B7280] shrink-0">
            <span>
              {selectedValues.length === 0
                ? 'All entities active'
                : `${selectedValues.length} ${selectedValues.length === 1 ? singular : plural} selected`}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-0.5 bg-[#111827] text-white rounded-[3px] text-[10.5px] font-sans font-medium hover:bg-[#1F2937] cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Active Selected Chips */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {selectedValues.map((val) => {
            const info = optionMap.get(val);
            const optLabel = info ? info.label : val;
            const count = info ? info.count : undefined;
            return (
              <span
                key={val}
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-[#111827] text-white rounded-[3px] text-[10.5px] font-sans shadow-2xs font-normal"
              >
                <span className="truncate max-w-[170px]" title={optLabel}>
                  {optLabel}
                  {count !== undefined && ` (${count})`}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleValue(val);
                  }}
                  className="hover:text-[#D9C01B] cursor-pointer ml-0.5"
                  title={`Remove ${optLabel}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
