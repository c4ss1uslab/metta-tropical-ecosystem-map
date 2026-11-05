import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus, Search, X } from 'lucide-react';
import { FieldOption } from '../utils/fieldOptions';

interface OptionsMultiSelectProps {
  /** Comma-separated list of selected values (same format the spreadsheet uses). */
  value: string;
  onChange: (value: string) => void;
  options: FieldOption[];
  /** When true, people can type and add their own option. */
  allowCustom?: boolean;
  placeholder?: string;
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Splits a comma-separated value into entries. Known options that themselves
 * contain commas (e.g. "Peace, Justice, ...") are re-assembled greedily.
 */
const splitValues = (value: string, options: FieldOption[]): string[] => {
  const tokens = value.split(',').map(v => v.trim()).filter(Boolean);
  const byNorm = new Map<string, string>();
  let maxParts = 1;
  for (const o of options) {
    byNorm.set(norm(o.value), o.value);
    maxParts = Math.max(maxParts, o.value.split(',').length);
  }
  const result: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (let len = Math.min(maxParts, tokens.length - i); len > 1; len--) {
      const known = byNorm.get(norm(tokens.slice(i, i + len).join(', ')));
      if (known) {
        result.push(known);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result.push(tokens[i]);
      i += 1;
    }
  }
  return result;
};

export const OptionsMultiSelect: React.FC<OptionsMultiSelectProps> = ({
  value,
  onChange,
  options,
  allowCustom = false,
  placeholder = 'Select...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => splitValues(value, options), [value, options]);
  const selectedSet = useMemo(() => new Set(selected.map(norm)), [selected]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    searchRef.current?.focus();
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const commit = (values: string[]) => onChange(values.join(', '));

  const toggle = (optionValue: string) => {
    if (selectedSet.has(norm(optionValue))) {
      commit(selected.filter(v => norm(v) !== norm(optionValue)));
    } else {
      commit([...selected, optionValue]);
    }
  };

  const remove = (v: string) => commit(selected.filter(s => s !== v));

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return options;
    return options.filter(o => norm(o.value).includes(q));
  }, [options, query]);

  // Custom entry: commas would split the value, so strip them.
  const customValue = query.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const canAddCustom =
    allowCustom &&
    !!customValue &&
    !selectedSet.has(norm(customValue)) &&
    !options.some(o => norm(o.value) === norm(customValue));

  const addCustom = () => {
    if (!canAddCustom) return;
    commit([...selected, customValue]);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canAddCustom) {
        addCustom();
      } else if (filtered.length === 1) {
        toggle(filtered[0].value);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
      setQuery('');
    }
  };

  let lastGroup: string | undefined;

  return (
    <div ref={containerRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(o => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(o => !o);
          }
        }}
        className={`w-full min-h-[34px] bg-white border p-1.5 rounded-[4px] text-xs flex items-center gap-1 cursor-pointer ${
          isOpen ? 'border-[#111827]' : 'border-[#E5E7EB]'
        }`}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selected.length === 0 && (
            <span className="text-[#9CA3AF] px-0.5">{placeholder}</span>
          )}
          {selected.map(v => (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827] rounded-[3px] px-1.5 py-0.5 text-[11px] max-w-full"
            >
              <span className="truncate" data-no-translate>{v}</span>
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(v);
                }}
                className="text-[#6B7280] hover:text-[#111827] shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-[4px] shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-[#F3F4F6] px-2 py-1.5">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={allowCustom ? 'Search or type your own...' : 'Search...'}
              className="w-full text-xs outline-none bg-transparent"
            />
          </div>

          <ul role="listbox" aria-multiselectable="true" className="max-h-[220px] overflow-y-auto py-1">
            {canAddCustom && (
              <li>
                <button
                  type="button"
                  onClick={addCustom}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-left text-[#111827] hover:bg-[#F9FAFB]"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Add “<span data-no-translate>{customValue}</span>”
                  </span>
                </button>
              </li>
            )}
            {filtered.length === 0 && !canAddCustom && (
              <li className="px-2.5 py-1.5 text-xs text-[#9CA3AF]">No matching options</li>
            )}
            {filtered.map(option => {
              const isSelected = selectedSet.has(norm(option.value));
              const showGroup = option.group && option.group !== lastGroup;
              lastGroup = option.group;
              return (
                <React.Fragment key={`${option.group || ''}::${option.value}`}>
                  {showGroup && (
                    <li className="px-2.5 pt-2 pb-1 font-technical text-[9.5px] uppercase font-semibold text-[#8C877F]">
                      {option.group}
                    </li>
                  )}
                  <li role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => toggle(option.value)}
                      className={`w-full flex items-center gap-1.5 py-1.5 pr-2.5 text-xs text-left hover:bg-[#F9FAFB] ${
                        option.sub ? 'pl-6' : 'pl-2.5'
                      } ${isSelected ? 'text-[#111827] font-medium' : 'text-[#374151]'}`}
                    >
                      <span
                        className={`w-3.5 h-3.5 shrink-0 rounded-[2px] border flex items-center justify-center ${
                          isSelected ? 'bg-[#111827] border-[#111827]' : 'border-[#D1D5DB]'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                      <span data-no-translate>{option.value}</span>
                    </button>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
