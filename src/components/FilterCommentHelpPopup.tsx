import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, FileSpreadsheet } from 'lucide-react';
import { getColumnComment, useColumnComment, cleanSpreadsheetComment } from '../utils/columnComments';

export interface FilterCommentHelpPopupProps {
  cellRef: string; // e.g. "BA2", "BH2", "BO2", "BP2", "BQ2", "CB2"
  fieldName: string; // e.g. "Situational Assessment"
  customComment?: string;
  category?: string; // e.g. "Worldview & Change Orientation", "Warm Data"
  className?: string;
}

export const FilterCommentHelpPopup: React.FC<FilterCommentHelpPopupProps> = ({
  cellRef,
  fieldName,
  customComment,
  category = 'Worldview & Change Orientation',
  className = ''
}) => {
  const dynamicComment = useColumnComment(fieldName, cellRef);
  const rawComment = customComment || dynamicComment || (cellRef ? getColumnComment(cellRef) : undefined) || getColumnComment(fieldName);
  const comment = cleanSpreadsheetComment(rawComment);
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = 320; // Matches data completeness tooltip width

    // Position to the right of the button if space permits
    let left = rect.right + 10;
    if (left + tooltipWidth > window.innerWidth - 12) {
      // Otherwise position to the left of the button
      left = Math.max(12, rect.left - tooltipWidth - 10);
    }

    // Align vertically with button, clamping to viewport
    let top = rect.top - 8;
    const estimatedHeight = 220;
    if (top + estimatedHeight > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - (estimatedHeight + 20));
    }
    if (top < 12) top = 12;

    setCoords({ top, left });
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleTooltipMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    if (isPinned) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOpen && isPinned) {
      setIsOpen(false);
      setIsPinned(false);
    } else {
      updatePosition();
      setIsOpen(true);
      setIsPinned(true);
    }
  };

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsPinned(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsPinned(false);
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen) {
        updatePosition();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [isOpen, updatePosition]);

  const displayComment = comment || `No comment attached to cell ${cellRef} in the uploaded spreadsheet.`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold font-technical transition-colors cursor-pointer focus:outline-none shrink-0 ${
          isOpen
            ? 'bg-[#111827] text-white shadow-2xs'
            : 'bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#4B5563] hover:text-[#111827]'
        } ${className}`}
        aria-label={`Spreadsheet note: ${fieldName} (${cellRef})`}
        title={`Click or hover to view spreadsheet header note (${cellRef})`}
      >
        ?
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className="z-[9999] w-80 p-3.5 bg-white border border-[#E5E7EB] rounded-[6px] shadow-2xl text-[#111827] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 select-text"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5E7EB]">
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#5B21B6] shrink-0" />
                <span className="font-technical text-[10.5px] text-[#111827] uppercase tracking-wider font-bold truncate">
                  {fieldName}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                <span className="font-technical text-[9px] font-bold text-[#5B21B6] bg-[#F3E8FF] border border-[#DDD6FE] px-1.5 py-0.5 rounded-[2px]">
                  Cell {cellRef}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    setIsPinned(false);
                  }}
                  className="text-[#9CA3AF] hover:text-[#111827] p-0.5 rounded hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Category / Subtitle */}
            <div className="mb-2 flex items-center justify-between text-[10px] font-technical text-[#6B7280]">
              <span className="flex items-center space-x-1 text-[#5B21B6] font-medium">
                <FileSpreadsheet className="w-3 h-3" />
                <span>Spreadsheet Cell Note</span>
              </span>
              {category && <span className="text-[#8C877F]">{category}</span>}
            </div>

            {/* Comment Body */}
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {displayComment.split('\n').map((paragraph, idx) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return <div key={idx} className="h-1" />;
                const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
                return (
                  <p
                    key={idx}
                    className={`font-sans text-xs text-[#374151] leading-relaxed select-text ${
                      isBullet ? 'pl-2 text-[#1F2937] font-medium' : ''
                    }`}
                  >
                    {trimmed}
                  </p>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-2.5 pt-2 border-t border-[#F3F4F6] flex items-center justify-between text-[9.5px] font-technical text-[#8C877F]">
              <span>Spreadsheet Cell Note ({cellRef})</span>
              <span>{isPinned ? 'Pinned (click to close)' : 'Hover or click to pin'}</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
