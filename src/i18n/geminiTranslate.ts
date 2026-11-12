/**
 * Gemini-powered English -> Brazilian Portuguese batch translation.
 *
 * Calls the application's server-side Gemini proxy (/api/gemini/translate)
 * using the server's configured GEMINI_API_KEY.
 */

const rawModel: string = (import.meta.env?.VITE_GEMINI_TRANSLATION_MODEL || 'gemini-3.8-flash').trim();
const MODEL: string = (rawModel === 'gemini-flash-latest' || !rawModel) ? 'gemini-3.8-flash' : rawModel;

const MAX_ITEMS_PER_BATCH = 60;
const MAX_CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;

let cachedAvailability: boolean | null = null;
let checkingAvailabilityPromise: Promise<boolean> | null = null;

export async function checkGeminiTranslationAvailable(): Promise<boolean> {
  if (cachedAvailability !== null) return cachedAvailability;
  if (checkingAvailabilityPromise) return checkingAvailabilityPromise;

  checkingAvailabilityPromise = fetch('/api/gemini/status')
    .then(async (res) => {
      if (!res.ok) {
        cachedAvailability = false;
        return false;
      }
      const data = await res.json();
      cachedAvailability = Boolean(data.available);
      return cachedAvailability;
    })
    .catch(() => {
      cachedAvailability = false;
      return false;
    })
    .finally(() => {
      checkingAvailabilityPromise = null;
    });

  return checkingAvailabilityPromise;
}

// Eagerly initiate status check in the background
if (typeof window !== 'undefined') {
  checkGeminiTranslationAvailable();
}

export function isGeminiTranslationAvailable(): boolean {
  // If not yet determined, assume available so the request reaches the server endpoint
  return cachedAvailability !== false;
}

interface BatchItem {
  i: number;
  text: string;
}

function makeBatches(texts: string[]): BatchItem[][] {
  const batches: BatchItem[][] = [];
  let current: BatchItem[] = [];
  let chars = 0;
  const MAX_CHARS_PER_BATCH = 12000;

  texts.forEach((text, i) => {
    if (current.length > 0 && (current.length >= MAX_ITEMS_PER_BATCH || chars + text.length > MAX_CHARS_PER_BATCH)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push({ i, text });
    chars += text.length;
  });
  if (current.length) batches.push(current);
  return batches;
}

async function translateBatch(items: BatchItem[]): Promise<Map<number, string>> {
  const res = await fetch('/api/gemini/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, model: MODEL }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    if (res.status === 503) {
      cachedAvailability = false;
    }
    throw new Error(errorBody.error || `Translation request failed with HTTP ${res.status}`);
  }

  const data = await res.json();
  const out = new Map<number, string>();
  const wanted = new Set(items.map((it) => it.i));

  for (const row of Array.isArray(data.translations) ? data.translations : []) {
    if (row && wanted.has(row.i) && typeof row.t === 'string' && row.t.trim()) {
      out.set(row.i, row.t);
    }
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface TranslateProgress {
  done: number;
  total: number;
}

/**
 * Translate many strings. Returns a map source -> translation for every string
 * that was translated successfully; failures are simply absent (retried on the next sync).
 */
export async function translateStringsToPtBr(
  texts: string[],
  onProgress?: (p: TranslateProgress) => void
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!texts.length) return result;

  const available = await checkGeminiTranslationAvailable();
  if (!available) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const batches = makeBatches(texts);
  let done = 0;
  onProgress?.({ done, total: texts.length });

  let next = 0;
  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next++];
      let pending = batch;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS && pending.length; attempt++) {
        try {
          const got = await translateBatch(pending);
          got.forEach((tr, i) => result.set(texts[i], tr));
          pending = pending.filter((it) => !got.has(it.i)); // retry only what came back missing
        } catch (err) {
          console.warn(`[i18n] Gemini translation batch failed (attempt ${attempt}/${MAX_ATTEMPTS}):`, err);
          if (attempt < MAX_ATTEMPTS) await sleep(1500 * attempt);
        }
      }
      done += batch.length;
      onProgress?.({ done, total: texts.length });
    }
  };

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, batches.length) }, worker));
  return result;
}
