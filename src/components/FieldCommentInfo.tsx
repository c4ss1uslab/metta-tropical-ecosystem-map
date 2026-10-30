import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import { getColumnComment, useColumnComment, cleanSpreadsheetComment } from '../utils/columnComments';

interface FieldCommentInfoProps {
  fieldName: string;
  comment?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const FieldCommentInfo: React.FC<FieldCommentInfoProps> = ({
  fieldName,
  comment: directComment,
  size = 'sm',
  className = ''
}) => {
  const dynamicComment = useColumnComment(fieldName);
  const rawComment = directComment || dynamicComment || getColumnComment(fieldName);
  const comment = cleanSpreadsheetComment(rawComment);
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 0,
    left: 0,
    placement: 'top'
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(380, window.innerWidth - 24);
    const estimatedHeight = 180;

    // Prefer displaying above the button unless close to top of viewport
    let placement: 'top' | 'bottom' = 'top';
    let top = rect.top - 8;

    if (rect.top < estimatedHeight + 20) {
      placement = 'bottom';
      top = rect.bottom + 8;
    }

    // Ensure it doesn't overflow bottom of screen
    if (placement === 'bottom' && top + estimatedHeight > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - (estimatedHeight + 20));
    }

    // Center horizontally on button, then clamp to viewport
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (left < 12) left = 12;
    if (left + tooltipWidth > window.innerWidth - 12) {
      left = window.innerWidth - 12 - tooltipWidth;
    }

    setCoords({ top, left, placement });
  }, []);

  // If no comment is defined for this field, do not render anything
  if (!comment) {
    return null;
  }

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

  const iconDim = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        className={`inline-flex items-center justify-center p-0.5 rounded-full transition-all cursor-help shrink-0 ${
          isOpen
            ? 'text-[#5B21B6] bg-[#EDE9FE] ring-2 ring-[#C4B5FD]'
            : 'text-[#9CA3AF] hover:text-[#5B21B6] hover:bg-[#F3E8FF]'
        } ${className}`}
        title={`Note: ${fieldName}`}
        aria-label={`Note: ${fieldName}`}
      >
        <Info className={iconDim} />
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
              top: coords.placement === 'bottom' ? `${coords.top}px` : undefined,
              bottom: coords.placement === 'top' ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              maxWidth: '380px',
              width: 'calc(100vw - 24px)',
              zIndex: 99999
            }}
            className="bg-white border border-[#D1D5DB] rounded-lg shadow-xl p-3.5 text-left animate-in fade-in zoom-in-95 duration-150 select-text"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#E5E7EB]">
              <h4 className="font-technical text-xs font-bold text-[#111827] uppercase tracking-wider truncate">
                {fieldName}
              </h4>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  setIsPinned(false);
                }}
                className="text-[#9CA3AF] hover:text-[#111827] p-0.5 rounded transition-colors cursor-pointer shrink-0"
                title="Close note"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Comment Body */}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {comment.split('\n').map((paragraph, idx) => {
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
            <div className="mt-2.5 pt-2 border-t border-[#F3F4F6] flex items-center justify-end text-[10px] font-technical text-[#8C877F]">
              <span>{isPinned ? 'Pinned (click to close)' : 'Hover or click to pin'}</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
