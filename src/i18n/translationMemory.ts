/**
 * pt-BR translation memory for ecosystem DATA (entity descriptions, tags,
 * locations, archipelago descriptions, column comments, changelog...).
 *
 * Storage: Firestore `ecosystem/translations_pt_BR` (metadata) plus chunk docs
 * `ecosystem/translations_pt_BR_chunk_N`, each holding `entries: [{ s, t }]`
 * (s = normalized English source, t = pt-BR translation).
 *
 * Incremental sync (runs as part of every data upload / cloud commit):
 *   1. collect every translatable English string in the new dataset
 *   2. diff against the stored memory (which already holds translations)
 *   3. send ONLY new/changed strings to Gemini
 *   4. drop translations whose source no longer exists anywhere in the data
 *   5. save the memory back and hot-swap it into the live DOM translator
 */
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { EcosystemEntity } from '../types';
import { normalizeText, setDataTranslations, translateText } from './domTranslator';
import { PT_BR_UI } from './ptBR.ui';
import { isGeminiTranslationAvailable, translateStringsToPtBr } from './geminiTranslate';

const MEMORY_DOC = 'translations_pt_BR';
const MEMORY_CHUNK_PREFIX = 'translations_pt_BR_chunk_';
const MAX_BYTES_PER_CHUNK = 350000;

// ---------------------------------------------------------------------------
// Collecting translatable strings
// ---------------------------------------------------------------------------

/** Entity fields that hold human-readable English text. */
const TEXT_FIELDS: (keyof EcosystemEntity)[] = [
  'description', 'location', 'language', 'stage', 'stream', 'organizationStructure',
  'spreadsheetCategory', 'ourRelationship', 'societalSector', 'societalSectorCatalist',
  'societalCategoryCatalist', 'biome', 'bioregion', 'country', 'operatingRegion',
  'operationFocus', 'maturityLevel', 'size', 'socialMediaReach', 'impactReach', 'reach',
  'influence', 'intellectualLineage', 'situationalAssessmentComments', 'altMutua',
  'valueMemeEthicalOrientation', 'notes', 'continent'
];
const LIST_FIELDS: (keyof EcosystemEntity)[] = [
  'fields', 'approach', 'issues', 'activities', 'streams', 'otherArchipelagos',
  'ethnicSpiritualLineages', 'secondaryCategories'
];
/** Spreadsheet columns that hold proper names / identifiers: never translated. */
const NON_TRANSLATABLE_COLUMN = /(name|founder|partner|funder|teacher|collaborator|website|url|link|email|contact|phone|social|instagram|linkedin|facebook|twitter|youtube|tiktok|github|handle|org id|^id$|year|date|filled fields|favicon|logo|image|photo|coordinates|latitude|longitude)/i;

const isTranslatable = (s: string): boolean => {
  if (s.length < 2 || s.length > 20000) return false;
  if (!/[A-Za-z]{2}/.test(s)) return false;
  if (/^(https?:\/\/|www\.)\S+$/i.test(s)) return false;
  if (/^\S+@\S+\.\S+$/.test(s)) return false;
  if (/^@\w+$/.test(s)) return false;
  if (/^[\d\s.,:%+\-–—/()$€£R]+$/.test(s)) return false;
  return true;
};

/** Values like "A; B; C" are often rendered as individual chips: also collect the parts. */
const splitParts = (s: string): string[] => {
  const parts = s.split(/\s*[;|\n]\s*/).filter(Boolean);
  if (parts.length > 1) return parts;
  const commaParts = s.split(/\s*,\s*/).filter(Boolean);
  if (commaParts.length > 1 && commaParts.every(p => p.length <= 40 && !/[.!?]/.test(p))) return commaParts;
  return [];
};

const stripArchipelagoNumber = (s: string) => s.replace(/^\s*\d+\s*[.)-]\s*/, '');

export interface TranslationSources {
  entities: EcosystemEntity[];
  /** Any other displayed English text: archipelago descriptions, column comments, changelog... */
  extraStrings?: Iterable<string | undefined | null>;
}

export function collectTranslatableStrings({ entities, extraStrings }: TranslationSources): Set<string> {
  const out = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v !== 'string') return;
    const n = normalizeText(v);
    if (!isTranslatable(n)) return;
    out.add(n);
    splitParts(n).forEach(p => { if (isTranslatable(p)) out.add(p); });
  };
  const addArchipelago = (v: unknown) => {
    if (typeof v !== 'string') return;
    add(v);
    add(stripArchipelagoNumber(v));
  };

  for (const ent of entities) {
    for (const f of TEXT_FIELDS) (f === 'continent' ? addArchipelago : add)(ent[f]);
    for (const f of LIST_FIELDS) {
      const list = ent[f];
      if (Array.isArray(list)) list.forEach(f === 'otherArchipelagos' ? addArchipelago : add);
    }
    ent.communityNotes?.forEach(n => add(n?.content));

    const cf = ent.categorizedFields;
    if (cf && typeof cf === 'object') {
      for (const [category, cols] of Object.entries(cf)) {
        add(category);
        if (!cols || typeof cols !== 'object') continue;
        for (const [col, val] of Object.entries(cols as Record<string, unknown>)) {
          add(col);
          if (NON_TRANSLATABLE_COLUMN.test(col)) continue;
          if (Array.isArray(val)) val.forEach(add); else add(val);
        }
      }
    }
    const ef = ent.extraFields;
    if (ef && typeof ef === 'object') {
      for (const [col, val] of Object.entries(ef as Record<string, unknown>)) {
        if (col.startsWith('__') || /^col_\d+$/i.test(col)) continue;
        add(col);
        if (NON_TRANSLATABLE_COLUMN.test(col)) continue;
        if (Array.isArray(val)) val.forEach(add); else add(val);
      }
    }
  }
  if (extraStrings) for (const s of extraStrings) add(s);
  return out;
}

// ---------------------------------------------------------------------------
// Firestore persistence
// ---------------------------------------------------------------------------

export async function loadTranslationMemory(): Promise<Map<string, string>> {
  const memory = new Map<string, string>();
  const metaSnap = await getDoc(doc(db, 'ecosystem', MEMORY_DOC));
  if (!metaSnap.exists()) return memory;
  const chunkCount = Number(metaSnap.data()?.chunkCount) || 0;
  const snaps = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) => getDoc(doc(db, 'ecosystem', `${MEMORY_CHUNK_PREFIX}${i}`)))
  );
  for (const snap of snaps) {
    const entries = snap.exists() ? snap.data()?.entries : null;
    if (Array.isArray(entries)) {
      for (const e of entries) if (e && typeof e.s === 'string' && typeof e.t === 'string') memory.set(e.s, e.t);
    }
  }
  return memory;
}

async function saveTranslationMemory(memory: Map<string, string>): Promise<void> {
  const metaRef = doc(db, 'ecosystem', MEMORY_DOC);
  let prevChunkCount = 0;
  try {
    const snap = await getDoc(metaRef);
    if (snap.exists()) prevChunkCount = Number(snap.data()?.chunkCount) || 0;
  } catch {
    // non-fatal
  }

  const chunks: { s: string; t: string }[][] = [];
  let current: { s: string; t: string }[] = [];
  let bytes = 0;
  const sorted = [...memory.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [s, t] of sorted) {
    const size = (s.length + t.length) * 2 + 16; // conservative UTF-8 estimate
    if (current.length && bytes + size > MAX_BYTES_PER_CHUNK) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push({ s, t });
    bytes += size;
  }
  if (current.length) chunks.push(current);

  await Promise.all(chunks.map((entries, i) =>
    setDoc(doc(db, 'ecosystem', `${MEMORY_CHUNK_PREFIX}${i}`), { chunkIndex: i, count: entries.length, entries, updatedAt: serverTimestamp() })
  ));
  if (prevChunkCount > chunks.length) {
    await Promise.all(
      Array.from({ length: prevChunkCount - chunks.length }, (_, k) =>
        deleteDoc(doc(db, 'ecosystem', `${MEMORY_CHUNK_PREFIX}${chunks.length + k}`)).catch(() => {}))
    );
  }
  await setDoc(metaRef, {
    language: 'pt-BR',
    chunkCount: chunks.length,
    totalCount: memory.size,
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString()
  });
}

// ---------------------------------------------------------------------------
// Live memory for the DOM translator
// ---------------------------------------------------------------------------

let liveMemory: Map<string, string> | null = null;
let loadingPromise: Promise<void> | null = null;
let liveVersion: string | null = null;
let watching = false;

/** Reload translations when another session publishes a new memory version. */
function watchForRemoteUpdates() {
  if (watching) return;
  watching = true;
  try {
    onSnapshot(doc(db, 'ecosystem', MEMORY_DOC), snap => {
      if (snap.metadata.hasPendingWrites || !snap.exists()) return;
      const version = String(snap.data()?.updatedAtIso || '');
      if (liveVersion === null) {
        liveVersion = version;
        return;
      }
      if (version && version !== liveVersion) {
        liveVersion = version;
        ensureTranslationMemoryLoaded(true);
      }
    }, err => console.warn('[i18n] translation memory subscription error:', err));
  } catch (err) {
    console.warn('[i18n] could not watch translation memory:', err);
  }
}

/** Load the stored memory into the DOM translator (once; call again with force to refresh). */
export function ensureTranslationMemoryLoaded(force = false): Promise<void> {
  watchForRemoteUpdates();
  if (liveMemory && !force) return Promise.resolve();
  if (loadingPromise && !force) return loadingPromise;
  loadingPromise = loadTranslationMemory()
    .then(mem => {
      liveMemory = mem;
      setDataTranslations(mem);
    })
    .catch(err => {
      console.warn('[i18n] Could not load pt-BR translation memory:', err);
    })
    .finally(() => {
      loadingPromise = null;
    });
  return loadingPromise;
}

// ---------------------------------------------------------------------------
// Incremental sync
// ---------------------------------------------------------------------------

export type TranslationSyncState = 'idle' | 'checking' | 'translating' | 'saving' | 'done' | 'error' | 'unavailable';

export interface TranslationSyncStatus {
  state: TranslationSyncState;
  done?: number;
  total?: number;
  added?: number;
  removed?: number;
  failed?: number;
  message?: string;
}

type StatusListener = (s: TranslationSyncStatus) => void;
const statusListeners = new Set<StatusListener>();
let status: TranslationSyncStatus = { state: 'idle' };

const setStatus = (s: TranslationSyncStatus) => {
  status = s;
  statusListeners.forEach(l => l(s));
};
export const getTranslationSyncStatus = () => status;
export function subscribeToTranslationSync(l: StatusListener): () => void {
  statusListeners.add(l);
  return () => {
    statusListeners.delete(l);
  };
}

/** Strings already covered by the static UI dictionary never need an LLM call. */
const isCoveredByUiDictionary = (s: string): boolean =>
  Object.prototype.hasOwnProperty.call(PT_BR_UI, s);

let running: Promise<TranslationSyncStatus> | null = null;
let queued: TranslationSources | null = null;

export interface TranslationSyncPlan {
  /** English strings that need a (new) translation. */
  missing: string[];
  /** Stored translations that are still in use. */
  kept: Map<string, string>;
  /** Number of stored translations dropped because their source text no longer exists. */
  removed: number;
}

/**
 * Diff step of the sync: compare the strings the data needs against the stored
 * (already translated) memory. Unchanged text reuses its stored translation; new
 * or edited text is "missing"; translations of text that disappeared are dropped.
 */
export function planTranslationSync(
  needed: Set<string>,
  stored: Map<string, string>,
  isAlreadyCovered: (s: string) => boolean = () => false
): TranslationSyncPlan {
  const missing: string[] = [];
  for (const s of needed) {
    if (!stored.has(s) && !isAlreadyCovered(s)) missing.push(s);
  }
  const kept = new Map<string, string>();
  let removed = 0;
  for (const [s, tr] of stored) {
    if (needed.has(s)) kept.set(s, tr); else removed++;
  }
  return { missing, kept, removed };
}

async function runSync(sources: TranslationSources): Promise<TranslationSyncStatus> {
  setStatus({ state: 'checking' });
  const needed = collectTranslatableStrings(sources);
  const stored = await loadTranslationMemory();
  // Strings the static UI dictionary already handles (exactly, or via patterns/affixes) never need Gemini
  const { missing, kept: next, removed } = planTranslationSync(
    needed,
    stored,
    s => isCoveredByUiDictionary(s) || translateText(s) !== s
  );

  let failed = 0;
  if (missing.length) {
    if (!isGeminiTranslationAvailable()) {
      const st: TranslationSyncStatus = { state: 'unavailable', message: 'GEMINI_API_KEY is not configured: pt-BR translations were not updated.', failed: missing.length };
      setStatus(st);
      return st;
    }
    setStatus({ state: 'translating', done: 0, total: missing.length });
    const translated = await translateStringsToPtBr(missing, p => setStatus({ state: 'translating', ...p }));
    translated.forEach((tr, s) => next.set(s, tr));
    failed = missing.length - translated.size;
  }

  const added = missing.length - failed;
  if (added > 0 || removed > 0) {
    setStatus({ state: 'saving', added, removed });
    await saveTranslationMemory(next);
  }
  liveMemory = next;
  setDataTranslations(next);

  const st: TranslationSyncStatus = { state: 'done', added, removed, failed, total: needed.size };
  setStatus(st);
  return st;
}

/**
 * Bring the pt-BR translation memory in line with the given data.
 * Only new/changed English strings are translated. Calls made while a sync is
 * running are coalesced into one follow-up run with the latest data.
 */
export function syncPtBrTranslations(sources: TranslationSources): Promise<TranslationSyncStatus> {
  if (running) {
    queued = sources;
    return running;
  }
  running = (async () => {
    let result: TranslationSyncStatus;
    try {
      // Make sure the live memory matches storage before diffing (see translateText guard)
      await ensureTranslationMemoryLoaded(true);
      result = await runSync(sources);
    } catch (err: any) {
      console.warn('[i18n] pt-BR translation sync failed:', err);
      result = { state: 'error', message: err?.message || String(err) };
      setStatus(result);
    } finally {
      running = null;
    }
    if (queued) {
      const nextSources = queued;
      queued = null;
      return syncPtBrTranslations(nextSources);
    }
    return result;
  })();
  return running;
}
