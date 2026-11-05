import React, { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import {
  getTranslationSyncStatus,
  subscribeToTranslationSync,
  TranslationSyncStatus
} from '../i18n/translationMemory';

/**
 * Small bottom-right status card for the pt-BR translation step of a data sync.
 * Stays hidden for no-op syncs (nothing new to translate).
 */
export const TranslationSyncToast: React.FC = () => {
  const [status, setStatus] = useState<TranslationSyncStatus>(getTranslationSyncStatus());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let warnedUnavailable = false;
    const unsub = subscribeToTranslationSync(s => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      setStatus(s);
      const meaningfulDone = s.state === 'done' && ((s.added || 0) > 0 || (s.removed || 0) > 0 || (s.failed || 0) > 0);
      const show =
        s.state === 'translating' ||
        s.state === 'saving' ||
        s.state === 'error' ||
        meaningfulDone ||
        (s.state === 'unavailable' && !warnedUnavailable);
      if (s.state === 'unavailable') warnedUnavailable = true;
      if (s.state === 'checking') return; // keep whatever is showing
      setVisible(show);
      if (show && (s.state === 'done' || s.state === 'error' || s.state === 'unavailable')) {
        hideTimer = setTimeout(() => setVisible(false), 7000);
      }
    });
    return () => {
      unsub();
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  const pct = status.total ? Math.round(((status.done || 0) / status.total) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs w-full px-1" role="status" aria-live="polite">
      <div className="p-3 bg-[#111827] text-white border border-[#374151] rounded-[6px] shadow-2xl text-xs font-sans space-y-1.5">
        <div className="flex items-center space-x-2">
          <Languages className="w-3.5 h-3.5 text-[#D9C01B] shrink-0" />
          <span className="font-semibold">Portuguese (pt-BR) translation</span>
        </div>
        {status.state === 'translating' && (
          <>
            <p className="text-[#D1D5DB]">Translating new and updated content with Gemini…</p>
            <div className="h-1 bg-[#374151] rounded overflow-hidden">
              <div className="h-full bg-[#D9C01B] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-[#9CA3AF] font-technical">{status.done || 0} / {status.total || 0}</p>
          </>
        )}
        {status.state === 'saving' && <p className="text-[#D1D5DB]">Saving translations to cloud…</p>}
        {status.state === 'done' && (
          <p className="text-[#D1D5DB]">
            Translations updated: +{status.added || 0} new, {status.removed || 0} removed
            {(status.failed || 0) > 0 ? `, ${status.failed} pending retry` : ''}.
          </p>
        )}
        {(status.state === 'error' || status.state === 'unavailable') && (
          <p className="text-[#FCA5A5]">{status.message || 'Translation sync failed. It will retry on the next sync.'}</p>
        )}
      </div>
    </div>
  );
};
