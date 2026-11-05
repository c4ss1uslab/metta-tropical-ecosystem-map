/**
 * Runtime DOM translator (English -> Brazilian Portuguese).
 *
 * The UI is authored in English across many large components. Instead of
 * threading a t() call through every string, this engine watches the rendered
 * DOM (HTML + SVG) and swaps English text for its pt-BR translation in place:
 *
 *  - text nodes                      (JSX text, data values rendered as text)
 *  - user-facing attributes          (title, placeholder, aria-label, alt)
 *  - document.title, <html lang>, and alert/confirm/prompt messages
 *
 * Two dictionaries feed it:
 *  1. The static UI dictionary (src/i18n/ptBR.ui.ts), reviewed by hand.
 *  2. The data translation memory (entity descriptions, tags, etc.), produced
 *     by Gemini during data sync and stored in Firestore (see translationMemory.ts).
 *
 * React-safety: only nodeValue / attribute values are edited in place. Nodes are
 * never wrapped or replaced, so React's reconciliation keeps working. When React
 * re-renders a text node with new English text, the observer re-translates it.
 * Switching back to English restores every original value.
 *
 * To keep an element untranslated, add `data-no-translate` (or `translate="no"`).
 */
import { AppLanguage, getLanguage, subscribeToLanguage } from './language';

const TRANSLATABLE_ATTRS = ['title', 'placeholder', 'aria-label', 'alt'] as const;
const SKIP_SELECTOR = 'script,style,noscript,textarea,code,pre,[contenteditable="true"],[data-no-translate],[translate="no"],.notranslate';

/** Collapse whitespace the same way the extractor (scripts/i18n-extract.ts) does. */
export const normalizeText = (s: string): string => s.replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
// Dictionaries
// ---------------------------------------------------------------------------

interface CompiledPattern {
  regex: RegExp;
  template: string;
  fixedLength: number;
}

let uiExact = new Map<string, string>();
let dataExact = new Map<string, string>();
let lowerIndex = new Map<string, string>();
let patterns: CompiledPattern[] = [];
let memo = new Map<string, string | null>();
/** Proper nouns (entity names) that must never be translated, even if a pattern matches. */
let protectedStrings = new Set<string>();

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function rebuildIndexes() {
  lowerIndex = new Map();
  // UI strings win over data strings on case-insensitive lookups
  for (const [k, v] of dataExact) lowerIndex.set(k.toLowerCase(), v);
  for (const [k, v] of uiExact) lowerIndex.set(k.toLowerCase(), v);
  memo = new Map();
}

/** Register the static UI dictionary. Keys containing {0}, {1}... become patterns. */
export function setUiDictionary(dict: Record<string, string>) {
  uiExact = new Map();
  const compiled: CompiledPattern[] = [];
  for (const [rawKey, value] of Object.entries(dict)) {
    const key = normalizeText(rawKey);
    if (!key || !value) continue;
    if (/\{\d+\}/.test(key)) {
      const parts = key.split(/\{\d+\}/);
      const body = key.split(/(\{\d+\})/).map(p => (/^\{\d+\}$/.test(p) ? '(.+?)' : escapeRegex(p))).join('');
      compiled.push({
        regex: new RegExp(`^${body}$`, 's'),
        template: value,
        fixedLength: parts.join('').length
      });
    } else {
      uiExact.set(key, value);
    }
  }
  // Most specific patterns first
  patterns = compiled.sort((a, b) => b.fixedLength - a.fixedLength);
  rebuildIndexes();
  refreshDom();
}

/** Register (replace) the data translation memory: normalized English source -> pt-BR. */
export function setDataTranslations(entries: Map<string, string> | Record<string, string>) {
  dataExact = new Map();
  const iter = entries instanceof Map ? entries.entries() : Object.entries(entries);
  for (const [k, v] of iter) {
    const key = normalizeText(k);
    if (key && v) dataExact.set(key, v);
  }
  rebuildIndexes();
  refreshDom();
}

/** Register strings that must stay as-is (e.g. organization / person names). */
export function setProtectedStrings(values: Iterable<string | undefined | null>) {
  const next = new Set<string>();
  for (const v of values) {
    if (typeof v === 'string') {
      const n = normalizeText(v);
      if (n) next.add(n);
    }
  }
  if (next.size === protectedStrings.size && [...next].every(v => protectedStrings.has(v))) return;
  protectedStrings = next;
  memo = new Map();
  refreshDom();
}

export function getDataTranslationCount(): number {
  return dataExact.size;
}

// ---------------------------------------------------------------------------
// String translation
// ---------------------------------------------------------------------------

const isAllCaps = (s: string) => /[A-Z]/.test(s) && s === s.toUpperCase();
const startsUpper = (s: string) => /^[A-Z]/.test(s);

function matchCase(source: string, translated: string): string {
  if (isAllCaps(source) && source.length > 1) return translated.toUpperCase();
  if (startsUpper(source) && /^[a-zà-ú]/.test(translated)) return translated[0].toUpperCase() + translated.slice(1);
  return translated;
}

function lookupDirect(core: string): string | null {
  const exact = uiExact.get(core) ?? dataExact.get(core);
  if (exact !== undefined) return exact;
  const ci = lowerIndex.get(core.toLowerCase());
  if (ci !== undefined) return matchCase(core, ci);
  return null;
}

const LEAD_AFFIX = /^([•·▸►→←↑↓✓✔✕×+\-–—*#(\[«"“'‘\s]+)/;
const TRAIL_AFFIX = /([:;,.!?…)\]»"”'’•·\s]+)$/;

function translateCoreUncached(core: string, depth: number): string | null {
  const direct = lookupDirect(core);
  if (direct !== null) return direct;

  // Peel punctuation / bullets around a known phrase: "Country:" , "(Optional)", "• Inner"
  const lead = core.match(LEAD_AFFIX)?.[1] ?? '';
  const rest = core.slice(lead.length);
  const trail = rest.match(TRAIL_AFFIX)?.[1] ?? '';
  const inner = rest.slice(0, rest.length - trail.length);
  if ((lead || trail) && inner && inner !== core) {
    const innerT = lookupDirect(inner) ?? (depth < 2 ? matchPatterns(inner, depth + 1) : null);
    if (innerT !== null) return lead + innerT + trail;
  }

  // Interpolated strings: "{0} entities on map"
  if (depth < 2) {
    const viaPattern = matchPatterns(core, depth + 1);
    if (viaPattern !== null) return viaPattern;
  }

  // Text truncated in JS with an ellipsis: match the prefix of a known data string
  const ell = core.match(/^(.*\S)\s*(\.\.\.|…)$/s);
  if (ell && ell[1].length >= 16) {
    const prefix = ell[1];
    for (const [src, tr] of dataExact) {
      if (src.length > prefix.length && src.startsWith(prefix)) {
        const ratio = prefix.length / src.length;
        let cut = Math.max(8, Math.round(tr.length * ratio));
        const space = tr.lastIndexOf(' ', cut);
        if (space > cut * 0.6) cut = space;
        return tr.slice(0, cut).trimEnd() + ell[2];
      }
    }
  }
  return null;
}

function matchPatterns(core: string, depth: number): string | null {
  for (const p of patterns) {
    const m = core.match(p.regex);
    if (!m) continue;
    const captures = m.slice(1);
    const translated = captures.map(c => translateCore(c, depth));
    // Short generic patterns ("{0} Change", "Open {0}") must not swallow long unrelated
    // sentences: only accept long captures when they are themselves translatable.
    if (p.fixedLength < 12 && captures.some((c, i) => translated[i] === null && c.length > 40)) continue;
    return p.template.replace(/\{(\d+)\}/g, (_, idx) => {
      const i = Number(idx);
      return translated[i] ?? captures[i] ?? '';
    });
  }
  return null;
}

function translateCore(core: string, depth = 0): string | null {
  if (!core || !/[A-Za-z]/.test(core)) return null;
  if (protectedStrings.has(core)) return null;
  if (depth === 0) {
    const cached = memo.get(core);
    if (cached !== undefined) return cached;
  }
  const result = translateCoreUncached(core, depth);
  if (depth === 0) {
    if (memo.size > 50000) memo = new Map();
    memo.set(core, result);
  }
  return result;
}

/**
 * Translate an English string to pt-BR, preserving surrounding whitespace.
 * Returns the input unchanged when no translation is known.
 */
export function translateText(text: string): string {
  if (!text) return text;
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!m) return text;
  const [, lead, body, trail] = m;
  const core = normalizeText(body);
  const tr = translateCore(core);
  return tr === null ? text : lead + tr + trail;
}

/** Translate only when pt-BR is active (handy for strings built outside the DOM). */
export function t(text: string): string {
  return getLanguage() === 'pt-BR' ? translateText(text) : text;
}

// ---------------------------------------------------------------------------
// DOM engine
// ---------------------------------------------------------------------------

interface NodeState { original: string; applied: string }
const textState = new WeakMap<Text, NodeState>();
const attrState = new WeakMap<Element, Record<string, NodeState>>();
const trackedTexts = new Set<Text>();
const trackedElements = new Set<Element>();

let active = false;
let observer: MutationObserver | null = null;
let originalTitle: string | null = null;

const shouldSkip = (el: Element | null): boolean => !!el && !!el.closest(SKIP_SELECTOR);

function pruneTracked() {
  if (trackedTexts.size > 20000) for (const n of trackedTexts) if (!n.isConnected) trackedTexts.delete(n);
  if (trackedElements.size > 20000) for (const e of trackedElements) if (!e.isConnected) trackedElements.delete(e);
}

function translateTextNode(node: Text) {
  const current = node.nodeValue ?? '';
  const state = textState.get(node);
  if (state && current === state.applied) return; // our own write
  const original = current;
  if (!/[A-Za-z]/.test(original)) {
    if (state) textState.delete(node);
    return;
  }
  const parent = node.parentElement;
  if (shouldSkip(parent)) return;
  const translated = translateText(original);
  if (translated === original) {
    if (state) textState.delete(node);
    return;
  }
  // <option> without an explicit value derives its value from its text: pin it first
  if (parent && parent.tagName === 'OPTION' && !parent.hasAttribute('value')) {
    parent.setAttribute('value', normalizeText(original));
  }
  textState.set(node, { original, applied: translated });
  trackedTexts.add(node);
  node.nodeValue = translated;
}

function translateAttr(el: Element, attr: string) {
  const current = el.getAttribute(attr);
  if (current === null) return;
  const states = attrState.get(el) || {};
  const state = states[attr];
  if (state && current === state.applied) return;
  if (shouldSkip(el)) return;
  const translated = translateText(current);
  if (translated === current) {
    if (state) delete states[attr];
    return;
  }
  states[attr] = { original: current, applied: translated };
  attrState.set(el, states);
  trackedElements.add(el);
  el.setAttribute(attr, translated);
}

function translateSubtree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  const el = root as Element;
  if (el.nodeType === Node.ELEMENT_NODE && shouldSkip(el)) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(n) {
      if (n.nodeType === Node.ELEMENT_NODE && (n as Element).matches(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let n: Node | null = walker.currentNode;
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) {
      translateTextNode(n as Text);
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const e = n as Element;
      for (const a of TRANSLATABLE_ATTRS) if (e.hasAttribute(a)) translateAttr(e, a);
    }
    n = walker.nextNode();
  }
}

function restoreAll() {
  for (const node of trackedTexts) {
    const st = textState.get(node);
    if (st && node.nodeValue === st.applied) node.nodeValue = st.original;
    textState.delete(node);
  }
  trackedTexts.clear();
  for (const el of trackedElements) {
    const states = attrState.get(el);
    if (states) {
      for (const [attr, st] of Object.entries(states)) {
        if (el.getAttribute(attr) === st.applied) el.setAttribute(attr, st.original);
      }
    }
    attrState.delete(el);
  }
  trackedElements.clear();
}

function applyDocumentTitle(lang: AppLanguage) {
  if (originalTitle === null) originalTitle = document.title;
  document.title = lang === 'pt-BR' ? translateText(originalTitle) : originalTitle;
  document.documentElement.setAttribute('lang', lang === 'pt-BR' ? 'pt-BR' : 'en');
}

function onMutations(records: MutationRecord[]) {
  if (!active) return;
  for (const r of records) {
    if (r.type === 'characterData') {
      translateTextNode(r.target as Text);
    } else if (r.type === 'attributes' && r.attributeName) {
      translateAttr(r.target as Element, r.attributeName);
    } else if (r.type === 'childList') {
      r.addedNodes.forEach(n => translateSubtree(n));
    }
  }
  pruneTracked();
}

/** Re-run translation over the whole page (after a dictionary update). */
export function refreshDom() {
  if (!active || typeof document === 'undefined') return;
  // Restore first so text translated under the previous dictionaries is re-evaluated
  restoreAll();
  translateSubtree(document.body);
  applyDocumentTitle('pt-BR');
}

function activate() {
  if (active) return;
  active = true;
  translateSubtree(document.body);
  observer = new MutationObserver(onMutations);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...TRANSLATABLE_ATTRS]
  });
  applyDocumentTitle('pt-BR');
}

function deactivate() {
  if (!active) return;
  active = false;
  observer?.disconnect();
  observer = null;
  restoreAll();
  applyDocumentTitle('en');
}

let dialogsPatched = false;
function patchDialogs() {
  if (dialogsPatched || typeof window === 'undefined') return;
  dialogsPatched = true;
  const { alert, confirm, prompt } = window;
  window.alert = (msg?: any) => alert.call(window, typeof msg === 'string' ? t(msg) : msg);
  window.confirm = (msg?: string) => confirm.call(window, typeof msg === 'string' ? t(msg) : msg);
  window.prompt = (msg?: string, def?: string) => prompt.call(window, typeof msg === 'string' ? t(msg) : msg, def);
}

let installed = false;
/** Install once at boot: follows the global language store. */
export function installDomTranslator() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  patchDialogs();
  const sync = (lang: AppLanguage) => (lang === 'pt-BR' ? activate() : deactivate());
  sync(getLanguage());
  subscribeToLanguage(sync);
}
