import React, { useEffect, useRef, useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { AppLanguage, setLanguage, useLanguage } from '../i18n/language';

const OPTIONS: { value: AppLanguage; code: string; name: string }[] = [
  { value: 'en', code: 'EN', name: 'English' },
  { value: 'pt-BR', code: 'PT-BR', name: 'Português' },
];

/**
 * Compact language switch shown as the last (right-most) button of the top menu.
 * Shows only the language icon; hovering (or tapping, on touch screens) reveals
 * a small menu with both languages, the active one marked and the other selectable.
 * Marked data-no-translate so its own labels are never rewritten by the DOM translator.
 */
export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const lang = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerTypeRef = useRef('');
  const label = lang === 'pt-BR' ? 'Idioma' : 'Language';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      data-no-translate
      className={`relative shrink-0 ${className}`}
      onPointerEnter={e => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={e => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        id="header-language-btn"
        type="button"
        // Mouse users get the menu on hover; clicks toggle it for touch/pen/keyboard
        onPointerDown={e => { pointerTypeRef.current = e.pointerType; }}
        onClick={() => {
          if (pointerTypeRef.current === 'mouse') setOpen(true);
          else setOpen(prev => !prev);
          pointerTypeRef.current = '';
        }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center justify-center p-2 bg-white hover:bg-[#FAF8F5] text-[#111827] border rounded-[4px] shadow-xs transition-all cursor-pointer ${
          open ? 'border-[#111827]' : 'border-[#E5E7EB] hover:border-[#111827]'
        }`}
      >
        <Languages className="w-3.5 h-3.5 shrink-0" />
      </button>

      {open && (
        // pt-1 acts as an invisible hover bridge between the button and the menu
        <div className="absolute right-0 top-full pt-1 z-50">
          <div
            role="menu"
            aria-label={label}
            className="min-w-[140px] bg-white border border-[#111827] rounded-[4px] shadow-lg py-1"
          >
            {OPTIONS.map(opt => {
              const active = opt.value === lang;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  disabled={active}
                  onClick={() => {
                    setLanguage(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 text-left text-xs font-sans transition-colors ${
                    active
                      ? 'text-[#111827] font-bold cursor-default bg-[#FAF8F5]'
                      : 'text-[#8C877F] hover:text-[#111827] hover:bg-[#FAF8F5] cursor-pointer'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-technical text-[10px] tracking-wide w-9">{opt.code}</span>
                    <span>{opt.name}</span>
                  </span>
                  {active && <Check className="w-3 h-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
