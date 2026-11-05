import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

interface OptionsComboboxProps {
  /** Single free-text value. */
  value: string;
  onChange: (value: string) => void;
  /** Suggested values shown in the dropdown. */
  options: string[];
  placeholder?: string;
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Text input with a dropdown of suggested values. People can pick an option
 * or keep whatever they type.
 */
export const OptionsCombobox: React.FC<OptionsComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Filter only by what was typed since opening, so the full list shows
  // when the field already holds a picked value.
  const [filterText, setFilterText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = norm(filterText);
    if (!q) return options;
    return options.filter(o => norm(o).includes(q));
  }, [options, filterText]);

  const open = () => {
    setFilterText('');
    setIsOpen(true);
  };

  const pick = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`w-full bg-white border rounded-[4px] text-xs flex items-center ${
          isOpen ? 'border-[#111827]' : 'border-[#E5E7EB]'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={open}
          onChange={(e) => {
            onChange(e.target.value);
            setFilterText(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && isOpen) {
              e.stopPropagation();
              setIsOpen(false);
            } else if (e.key === 'Enter' && isOpen) {
              e.preventDefault();
              if (filterText && filtered.length === 1) pick(filtered[0]);
              else setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent p-2 text-xs outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={isOpen ? 'Hide options' : 'Show options'}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              open();
              inputRef.current?.focus();
            }
          }}
          className="px-2 self-stretch flex items-center text-[#6B7280] hover:text-[#111827]"
        >
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-[220px] overflow-y-auto py-1 bg-white border border-[#E5E7EB] rounded-[4px] shadow-lg"
        >
          {filtered.map(option => {
            const isSelected = norm(option) === norm(value);
            return (
              <li key={option} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(option)}
                  className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-left hover:bg-[#F9FAFB] ${
                    isSelected ? 'text-[#111827] font-medium' : 'text-[#374151]'
                  }`}
                >
                  <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                  <span data-no-translate>{option}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
