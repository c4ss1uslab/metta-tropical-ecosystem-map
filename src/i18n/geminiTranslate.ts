import { GoogleGenAI, Type } from '@google/genai';

/**
 * Gemini-powered English -> Brazilian Portuguese batch translation.
 *
 * Uses the project's existing GEMINI_API_KEY (injected by Vite at build time,
 * see vite.config.ts). The model can be overridden with VITE_GEMINI_TRANSLATION_MODEL.
 */

const API_KEY: string = (process.env.GEMINI_API_KEY || '').trim();
const MODEL: string = (import.meta.env?.VITE_GEMINI_TRANSLATION_MODEL || 'gemini-flash-latest').trim();

const MAX_ITEMS_PER_BATCH = 60;
const MAX_CHARS_PER_BATCH = 12000;
const MAX_CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;

let client: GoogleGenAI | null = null;

export function isGeminiTranslationAvailable(): boolean {
  return API_KEY.length > 0 && API_KEY !== 'MY_GEMINI_API_KEY';
}

function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: API_KEY });
  return client;
}

const SYSTEM_INSTRUCTION = `You are a professional English to Brazilian Portuguese (pt-BR) translator for the "Metta Tropical Ecosystem Map", a cartography of organizations, people and ideas working on inner (spiritual/contemplative), social, cultural and systems change: regenerative practice, wisdom traditions, education, indigenous and quilombola allyship, metacrisis research, alternative economics.

Rules:
- Translate each item's "text" into natural, fluent Brazilian Portuguese (not European Portuguese).
- Keep proper nouns unchanged: names of organizations, people, projects, brands, books, and established acronyms.
- Keep URLs, emails, @handles, numbers, dates, and leading numbering such as "22. " exactly as they are.
- Preserve line breaks, bullet markers, markdown, and punctuation structure.
- If an item is already in Portuguese or is only a proper noun, return it unchanged.
- Return exactly one output per input item, with the same "i".`;

interface BatchItem { i: number; text: string }

function makeBatches(texts: string[]): BatchItem[][] {
  const batches: BatchItem[][] = [];
  let current: BatchItem[] = [];
  let chars = 0;
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
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: JSON.stringify({ items }),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            i: { type: Type.INTEGER },
            t: { type: Type.STRING }
          },
          required: ['i', 't'],
          propertyOrdering: ['i', 't']
        }
      }
    }
  });
  const raw = response.text || '[]';
  const parsed = JSON.parse(raw) as { i: number; t: string }[];
  const wanted = new Set(items.map(it => it.i));
  const out = new Map<number, string>();
  for (const row of Array.isArray(parsed) ? parsed : []) {
    if (row && wanted.has(row.i) && typeof row.t === 'string' && row.t.trim()) out.set(row.i, row.t);
  }
  return out;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface TranslateProgress { done: number; total: number }

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
  if (!isGeminiTranslationAvailable()) throw new Error('GEMINI_API_KEY is not configured.');

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
          pending = pending.filter(it => !got.has(it.i)); // retry only what came back missing
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
