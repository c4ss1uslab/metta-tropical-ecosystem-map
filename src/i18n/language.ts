import { useSyncExternalStore } from 'react';

/**
 * Global UI language store.
 *
 * The map ships in English (source language) and Brazilian Portuguese.
 * The choice is remembered per browser in localStorage.
 */
export type AppLanguage = 'en' | 'pt-BR';

export const LANGUAGE_STORAGE_KEY = 'metta_ui_language_v1';

type Listener = (lang: AppLanguage) => void;

const readInitialLanguage = (): AppLanguage => {
  try {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
    if (stored === 'pt-BR' || stored === 'en') return stored;
  } catch {
    // storage unavailable (private mode, blocked site data)
  }
  return 'en';
};

let currentLanguage: AppLanguage = readInitialLanguage();
const listeners = new Set<Listener>();

export function getLanguage(): AppLanguage {
  return currentLanguage;
}

export function setLanguage(lang: AppLanguage): void {
  if (lang === currentLanguage) return;
  currentLanguage = lang;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // non-fatal
  }
  listeners.forEach(l => l(lang));
}

export function toggleLanguage(): AppLanguage {
  const next: AppLanguage = currentLanguage === 'en' ? 'pt-BR' : 'en';
  setLanguage(next);
  return next;
}

export function subscribeToLanguage(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React hook: re-renders when the UI language changes. */
export function useLanguage(): AppLanguage {
  return useSyncExternalStore(
    (cb) => subscribeToLanguage(() => cb()),
    getLanguage,
    getLanguage
  );
}
