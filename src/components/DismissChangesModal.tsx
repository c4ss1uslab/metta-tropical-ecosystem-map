import React, { useEffect } from 'react';
import { RotateCcw, AlertTriangle, X, Lock, Undo2 } from 'lucide-react';

interface DismissChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDismiss: (alsoExitEditMode?: boolean) => void;
  isDismissing?: boolean;
}

export const DismissChangesModal: React.FC<DismissChangesModalProps> = ({
  isOpen,
  onClose,
  onConfirmDismiss,
  isDismissing = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDismissing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDismissing]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[#FAF8F5] border border-[#111827] rounded-[8px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dismiss-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FEE2E2] border border-[#FECACA] flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4 text-[#DC2626]" />
            </div>
            <div>
              <h3 id="dismiss-modal-title" className="font-editorial text-base font-semibold text-[#111827] leading-tight">
                Dismiss Uncommitted Changes?
              </h3>
              <p className="font-technical text-[10.5px] text-[#716C64] uppercase tracking-wider mt-0.5">
                Revert to Last Committed Cloud State
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDismissing}
            className="p-1 text-[#8C877F] hover:text-[#111827] rounded-[4px] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="Cancel and close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3.5 text-xs font-sans text-[#374151]">
          <p className="leading-relaxed">
            You have active edits made during this Edit Mode session that have not yet been committed to the cloud database.
          </p>

          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] space-y-1.5 text-[11.5px] text-[#991B1B]">
            <div className="flex items-center space-x-1.5 font-semibold text-[#B91C1C]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Warning: This will discard pending adjustments</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[#7F1D1D] leading-relaxed">
              <li>All node coordinate shifts and drag movements will be reverted.</li>
              <li>Uncommitted entity text edits or tag changes will be reset.</li>
              <li>The map will be restored to the published dataset from the cloud.</li>
            </ul>
          </div>

          <p className="text-[11px] text-[#6B7280]">
            Previously committed versions saved in Cloud Firestore will remain completely safe and untouched.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-white border-t border-[#E5E7EB] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDismissing}
            className="px-3 py-2 text-xs font-sans font-medium text-[#4B5563] hover:text-[#111827] hover:bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] transition-colors cursor-pointer text-center"
          >
            Keep Editing
          </button>

          <button
            type="button"
            onClick={() => onConfirmDismiss(false)}
            disabled={isDismissing}
            className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-white hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] hover:border-[#DC2626] font-medium rounded-[4px] text-xs transition-colors cursor-pointer shadow-2xs"
            title="Discard changes and remain in edit mode"
          >
            <Undo2 className="w-3.5 h-3.5 text-[#DC2626]" />
            <span>{isDismissing ? 'Reverting...' : 'Dismiss & Keep Editing'}</span>
          </button>

          <button
            type="button"
            onClick={() => onConfirmDismiss(true)}
            disabled={isDismissing}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-medium rounded-[4px] text-xs transition-colors cursor-pointer shadow-xs"
            title="Discard changes and exit edit mode"
          >
            <Lock className="w-3.5 h-3.5 text-white" />
            <span>{isDismissing ? 'Reverting...' : 'Dismiss & Exit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
