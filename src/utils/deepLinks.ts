// Shareable deep links.
//
// Supported forms (path or hash, interchangeably):
//   /layer-1, /layer-2, /layer-3, /layer-all      -> open the map on that layer
//   /point-of-relation                            -> open the directory profile of that entity
//   /directory                                    -> open the directory
//   /submit-new                                   -> open the "submit new entry" form
//   /#layer-2, /#point-of-relation                -> same, hash form

export type MapLayerSelection = 1 | 2 | 3 | 'all';

export type DeepLink =
  | { kind: 'layer'; layer: MapLayerSelection }
  | { kind: 'entity'; slug: string }
  | { kind: 'directory' }
  | { kind: 'submit' };

// Fixed page links; these take precedence over entity slugs
export const DIRECTORY_TOKEN = 'directory';
export const SUBMIT_TOKEN = 'submit-new';

const LAYER_TOKEN_PATTERN = /^layer-(1|2|3|all)$/;

/** "Point of Relation" -> "point-of-relation" (accents stripped, & -> and). */
export function slugifyEntityName(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readRawToken(): { token: string; mode: 'hash' | 'path' } {
  const hashToken = safeDecode(window.location.hash.replace(/^#\/?/, '')).trim();
  if (hashToken) return { token: hashToken, mode: 'hash' };
  const pathToken = safeDecode(window.location.pathname.replace(/^\/+|\/+$/g, '')).trim();
  return { token: pathToken, mode: 'path' };
}

export function parseDeepLinkToken(rawToken: string): DeepLink | null {
  const token = rawToken.toLowerCase();
  if (!token) return null;
  const layerMatch = token.match(LAYER_TOKEN_PATTERN);
  if (layerMatch) {
    const value = layerMatch[1];
    return { kind: 'layer', layer: value === 'all' ? 'all' : (Number(value) as 1 | 2 | 3) };
  }
  if (token === DIRECTORY_TOKEN) return { kind: 'directory' };
  if (token === SUBMIT_TOKEN) return { kind: 'submit' };
  // Only single-segment paths are treated as entity slugs
  if (token.includes('/')) return null;
  const slug = slugifyEntityName(token);
  return slug ? { kind: 'entity', slug } : null;
}

export function readDeepLink(): DeepLink | null {
  if (typeof window === 'undefined') return null;
  return parseDeepLinkToken(readRawToken().token);
}

/**
 * Replace the deep-link token in the address bar (no new history entry).
 * Keeps whichever form (hash or path) is currently in use. Pass null to clear it.
 * Never touches URLs that don't look like one of our deep links (e.g. hosted previews).
 */
export function writeDeepLink(token: string | null) {
  if (typeof window === 'undefined') return;
  const { pathname, search, hash } = window.location;
  const { token: currentToken, mode } = readRawToken();
  if (currentToken && !parseDeepLinkToken(currentToken)) return;
  if ((currentToken || '').toLowerCase() === (token || '')) return;

  let nextPath = pathname;
  let nextHash = hash;
  if (mode === 'hash') {
    nextHash = token ? `#${token}` : '';
  } else {
    nextPath = token ? `/${token}` : '/';
  }
  if (nextPath === pathname && nextHash === hash) return;
  window.history.replaceState(window.history.state, '', `${nextPath}${search}${nextHash}`);
}
