import React from 'react';
import { Languages } from 'lucide-react';
import { toggleLanguage, useLanguage } from '../i18n/language';

/**
 * EN / PT-BR switch shown as the last (right-most) button of the top menu.
 * Marked data-no-translate so its own labels are never rewritten by the DOM translator.
 */
export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const lang = useLanguage();
  const isPt = lang === 'pt-BR';
  const label = isPt ? 'Mudar idioma para inglês (English)' : 'Switch language to Brazilian Portuguese (Português)';

  return (
    <button
      id="header-language-btn"
      type="button"
      data-no-translate
      onClick={() => toggleLanguage()}
      title={label}
      aria-label={label}
      className={`flex items-center sm:space-x-1.5 text-xs font-sans bg-white hover:bg-[#FAF8F5] text-[#111827] border border-[#E5E7EB] hover:border-[#111827] px-2 py-1.5 rounded-[4px] shadow-xs transition-all font-medium cursor-pointer whitespace-nowrap shrink-0 ${className}`}
    >
      <Languages className="hidden sm:block w-3.5 h-3.5 shrink-0 text-[#111827]" />
      {/* Phones: just the active language code to save header space */}
      <span className="sm:hidden font-technical text-[10px] tracking-wide font-bold">{isPt ? 'PT' : 'EN'}</span>
      <span className="hidden sm:inline font-technical text-[10px] tracking-wide">
        <span className={isPt ? 'text-[#8C877F]' : 'text-[#111827] font-bold'}>EN</span>
        <span className="text-[#D1D5DB] mx-0.5">/</span>
        <span className={isPt ? 'text-[#111827] font-bold' : 'text-[#8C877F]'}>PT-BR</span>
      </span>
    </button>
  );
};
