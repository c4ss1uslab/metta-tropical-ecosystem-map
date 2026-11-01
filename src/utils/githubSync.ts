import { ChangelogConfig, ChangelogItem, ChangelogTag } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

export const CHANGELOG_STORAGE_KEY = 'metta_map_changelog_config_v1';
export const CHANGELOG_COMMITTED_KEY = 'metta_map_changelog_committed_baseline_v1';
export const CHANGELOG_FIRESTORE_DOC = 'changelog_config';

export const DEFAULT_CHANGELOG_CONFIG: ChangelogConfig = {
  appVersion: '1.2.7',
  githubRepo: 'metta-earth/metta-ecosystem-map',
  githubBranch: 'main',
  lastSyncedAt: new Date().toISOString(),
  deletedEntryIds: [],
  entries: [
    {
      id: 'release-1-2-7',
      version: '1.2.7',
      date: '2026-10-31',
      title: 'Layer 2 Relationship Filter (7-9) Display & Auto-Selection',
      description: 'Integrated automatic display and auto-selection of relationships 7-9 when Layer 2 is selected in the left sidebar.',
      changes: [
        'Enabled auto-selection of relationships 7-9 (Following, Exploring / Interested in, Aware of) whenever Layer 2 is selected in the left sidebar',
        'Added dedicated Layer 2 relationship dropdown inside the Layer 2 card when expanded and beneath the layer switcher when collapsed',
        'Harmonized relationship counts, multi-select filtering, and scope drilldowns for relationships 7 to 9',
        'Updated layer change handlers to cleanly toggle between Layer 1 (1-6) and Layer 2 (7-9) relationship filter presets'
      ],
      tag: 'fix',
      author: 'AI Studio Assistant',
      source: 'manual'
    },
    {
      id: 'release-1-2-6',
      version: '1.2.6',
      date: '2026-10-31',
      title: 'Firestore 1MB Limit Resolution via Partitioned Dataset Chunking',
      description: 'Partitioned large published ecosystem datasets across chunked Firestore documents to eliminate 1MB size limit errors during cloud commits.',
      changes: [
        'Resolved Firestore document size limit error (1,048,576 bytes) by introducing automatic partitioned dataset chunking',
        'Partitioned entities array into sub-documents (published_dataset_chunk_*) capped at ~350 KB and 25 entities per chunk',
        'Maintained backwards compatibility for single-document datasets alongside high-performance parallel chunk loading',
        'Updated real-time subscription listener and offline backup scripts to seamlessly hydrate chunked cloud datasets'
      ],
      tag: 'fix',
      author: 'AI Studio Assistant',
      source: 'manual'
    },
    {
      id: 'release-1-2-5',
      version: '1.2.5',
      date: '2026-10-29',
      title: 'Changelog Subtitle & Overview Description Authoring Support',
      description: 'Full authoring and inline editing capabilities for changelog entry subtitles and descriptions with persistent cloud synchronization.',
      changes: [
        'Added dedicated Subtitle / Description input field to both the changelog entry editor and new entry authoring form',
        'Enabled direct click-to-edit interaction on release subtitles and overview descriptions in Edit Mode',
        'Integrated change detection (diff tracking) for subtitle modifications to automatically trigger uncommitted change alerts and Cloud Commit',
        'Added instant Changelog Edit Mode unlock toggle directly inside the changelog widget for seamless updates'
      ],
      tag: 'feature',
      author: 'AI Studio Assistant',
      source: 'manual'
    },
    {
      id: 'release-1-2-4',
      version: '1.2.4',
      date: '2026-10-29',
      title: 'Right-Sidebar On-Demand Quadrant Sizes & Edit Mode Header Refinement',
      description: 'Relocated quadrant size controls to the right sidebar below snapshots with on-demand display, and cleaned top header in edit mode.',
      changes: [
        'Prevented the quadrant sizing box from automatically popping up upon entering Edit Mode',
        'Added Quadrant Sizes control button in the right sidebar below Positions Snapshot, opening only on demand',
        'Integrated expandable quadrant dimensions panel directly within the right sidebar with quick presets, layer selection, and uniform size sliders',
        'Removed redundant Positions Snapshot button from the top navigation header in Edit Mode for a cleaner bar'
      ],
      tag: 'ui',
      author: 'AI Studio Assistant',
      source: 'manual'
    },
    {
      id: 'release-1-2-3',
      version: '1.2.3',
      date: '2026-10-29',
      title: 'Permanent Deletion & Tombstone Tracking in Changelog',
      description: 'Permanent deletion guarantee for changelog entries across cloud commits, real-time listeners, and local baselines.',
      changes: [
        'Fixed issue where deleted changelog entries were resurrected on cloud commit due to default seed re-merging',
        'Implemented deletedEntryIds tombstone tracking persisted in Firestore to permanently purge deleted entries',
        'Updated real-time Firestore listeners to strictly respect user deletions and avoid phantom entry reloads',
        'Protected baseline snapshots and diff calculations to guarantee deletions stay committed permanently'
      ],
      tag: 'fix',
      author: 'AI Studio Assistant',
      source: 'manual'
    },
    {
      id: 'release-1-2-2',
      version: '1.2.2',
      date: '2026-10-29',
      title: 'Cloud Persistence & Commit Engine for Map Changelog',
      description: 'Persistent cloud storage on Firestore with explicit commit identification, sync pipeline, and automated assistant change logging.',
      changes: [
        'Added cloud persistence for Map Changelog backed by Firestore (doc: ecosystem/changelog_config)',
        'Added dedicated "Commit to Cloud" button with change diff detection and uncommitted status indicator',
        'Real-time Firestore synchronization ensures changelog updates persist across devices, tabs, and page reloads',
        'Added automatic change-logging protocol for all AI Studio assistant modifications with automatic cloud saving'
      ],
      tag: 'feature',
      author: 'AI Studio Assistant',
      source: 'manual'
    },
    {
      id: 'release-1-2-0',
      version: '1.2.0',
      date: '2026-09-13',
      title: 'Ecotones Ergonomics & Map Changelog System',
      description: 'Major improvements to ecotone visibility controls and integrated live changelog with GitHub tracking.',
      changes: [
        'Moved "Show Ecotones Only" quick toggle directly above Transition Corridors & Spines for intuitive navigation',
        'Added dynamic interactive Changelog badge at the bottom right of the RPG map canvas',
        'Built real-time GitHub commit synchronization with automatic commit parsing and tags',
        'Full edit mode authoring support for custom changelog entries, version increments, and repo settings',
        'Enhanced multi-quadrant gradient nodes and elevated spine elevation labels'
      ],
      tag: 'feature',
      author: 'Metta Tropical Cartography Team',
      source: 'manual'
    },
    {
      id: 'release-1-1-4',
      version: '1.1.4',
      date: '2026-08-28',
      title: 'Dynamic World Boundaries & Coastline Editing',
      description: 'Infinite world expansion and customized archipelago shape editing.',
      changes: [
        'World and quadrant boundaries dynamically expand whenever entities or archipelagos move beyond default limits',
        'Added Archipelago Edit Mode with interactive polygon vertex bezier handles and drag-to-reshape coastline controls',
        'Added Community Notes system allowing persistent field notes on individual ecosystem nodes',
        'Improved anti-overlap force relaxation algorithm to guarantee clear spacing between nodes'
      ],
      tag: 'release',
      author: 'Metta Tropical Cartography Team',
      source: 'manual'
    },
    {
      id: 'release-1-1-0',
      version: '1.1.0',
      date: '2026-08-10',
      title: 'Bidirectional Spreadsheet Engine & Conflict Resolution',
      description: 'Seamless integration with external Excel and CSV datasets.',
      changes: [
        'Integrated Excel (.xlsx) and CSV spreadsheet import/export with intelligent column mapping',
        'Smart data synchronization with interactive preview of added, modified, and unchanged nodes',
        'Coordinate preservation engine ensures existing manual layouts remain locked across re-syncs',
        'Added Discovery Quests modal for gamified exploration of the ecosystem across all four quadrants'
      ],
      tag: 'ecosystem',
      author: 'Metta Tropical Cartography Team',
      source: 'manual'
    },
    {
      id: 'release-1-0-0',
      version: '1.0.0',
      date: '2026-07-15',
      title: 'Initial Metta Ecosystem Map Genesis',
      description: 'First public release of the interactive 2D RPG cartography for system change.',
      changes: [
        'RPG-inspired parchment canvas with 4 quadrants: Inner, Social, Cultural, and Systems Change',
        'Support for Organizations, People, and Ideas with color-coded nodes and detail inspection sidebar',
        'Thematic archipelago landmass clustering with natural organic borders and procedural terrain textures',
        'Full map navigation: pan, smooth zoom, quadrant centering, and entity search'
      ],
      tag: 'release',
      author: 'Metta Tropical Cartography Team',
      source: 'manual'
    }
  ]
};

/**
 * Sanitize an object for Firestore (eliminating undefined values and ensuring serializable objects)
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const res: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res;
  }
  return obj;
}

export function loadChangelogConfig(): ChangelogConfig {
  try {
    const raw = localStorage.getItem(CHANGELOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.entries) && parsed.appVersion) {
        return mergeWithCodeDefaults(parsed);
      }
    }
  } catch (e) {
    console.warn('Failed to load changelog config from localStorage', e);
  }
  return DEFAULT_CHANGELOG_CONFIG;
}

export function saveChangelogConfig(config: ChangelogConfig): void {
  try {
    localStorage.setItem(CHANGELOG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save changelog config to localStorage', e);
  }
}

export function loadCommittedChangelogBaseline(): ChangelogConfig {
  try {
    const raw = localStorage.getItem(CHANGELOG_COMMITTED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.entries) && parsed.appVersion) {
        const deletedSet = new Set(parsed.deletedEntryIds || []);
        return {
          ...parsed,
          entries: parsed.entries.filter((e: ChangelogItem) => !deletedSet.has(e.id)),
          deletedEntryIds: Array.from(deletedSet)
        };
      }
    }
  } catch {}
  return DEFAULT_CHANGELOG_CONFIG;
}

export function saveCommittedChangelogBaseline(config: ChangelogConfig): void {
  try {
    localStorage.setItem(CHANGELOG_COMMITTED_KEY, JSON.stringify(config));
  } catch {}
}

/**
 * Merges loaded changelog with the latest code-defined defaults so newly published assistant or codebase entries
 * are automatically included without discarding user edits or resurrecting user-deleted entries.
 */
export function mergeWithCodeDefaults(incoming: ChangelogConfig): ChangelogConfig {
  if (!incoming || !Array.isArray(incoming.entries)) return DEFAULT_CHANGELOG_CONFIG;

  const deletedSet = new Set(incoming.deletedEntryIds || []);
  const existingIds = new Set(incoming.entries.map(e => e.id));

  // Only consider code entries that have NOT been deleted by the user and aren't already present
  const missingCodeEntries = DEFAULT_CHANGELOG_CONFIG.entries.filter(
    e => !existingIds.has(e.id) && !deletedSet.has(e.id)
  );

  // Determine newest version
  let appVersion = incoming.appVersion || DEFAULT_CHANGELOG_CONFIG.appVersion;
  if (DEFAULT_CHANGELOG_CONFIG.appVersion > appVersion) {
    appVersion = DEFAULT_CHANGELOG_CONFIG.appVersion;
  }

  // Ensure no deleted entries sneak in from incoming
  const filteredIncomingEntries = incoming.entries.filter(e => !deletedSet.has(e.id));

  return {
    appVersion,
    githubRepo: incoming.githubRepo || DEFAULT_CHANGELOG_CONFIG.githubRepo,
    githubBranch: incoming.githubBranch || DEFAULT_CHANGELOG_CONFIG.githubBranch,
    lastSyncedAt: incoming.lastSyncedAt || new Date().toISOString(),
    entries: [...missingCodeEntries, ...filteredIncomingEntries],
    deletedEntryIds: Array.from(deletedSet)
  };
}

export interface ChangelogDiffResult {
  hasChanges: boolean;
  summary: string[];
  addedCount: number;
  modifiedCount: number;
  deletedCount: number;
  versionChanged: boolean;
  repoChanged: boolean;
}

/**
 * Computes exact changes between the active working changelog and the last committed cloud baseline.
 */
export function getUncommittedChangelogDiff(
  current: ChangelogConfig,
  committedBaseline?: ChangelogConfig | null
): ChangelogDiffResult {
  const baseline = committedBaseline || loadCommittedChangelogBaseline();
  const summary: string[] = [];

  const versionChanged = current.appVersion.trim() !== baseline.appVersion.trim();
  if (versionChanged) {
    summary.push(`Version updated: v${baseline.appVersion} → v${current.appVersion}`);
  }

  const repoChanged =
    current.githubRepo.trim() !== baseline.githubRepo.trim() ||
    (current.githubBranch || 'main') !== (baseline.githubBranch || 'main');
  if (repoChanged) {
    summary.push(`Repository/branch modified: ${current.githubRepo} (${current.githubBranch || 'main'})`);
  }

  const baselineMap = new Map(baseline.entries.map(e => [e.id, e]));
  const currentMap = new Map(current.entries.map(e => [e.id, e]));

  let addedCount = 0;
  let modifiedCount = 0;
  let deletedCount = 0;

  for (const item of current.entries) {
    const base = baselineMap.get(item.id);
    if (!base) {
      addedCount++;
    } else {
      // Check if fields modified
      const titleDiff = item.title !== base.title;
      const descDiff = (item.description || '') !== (base.description || '');
      const verDiff = item.version !== base.version;
      const dateDiff = item.date !== base.date;
      const tagDiff = item.tag !== base.tag;
      const authorDiff = (item.author || '') !== (base.author || '');
      const changesDiff = JSON.stringify(item.changes) !== JSON.stringify(base.changes);

      if (titleDiff || descDiff || verDiff || dateDiff || tagDiff || authorDiff || changesDiff) {
        modifiedCount++;
      }
    }
  }

  for (const base of baseline.entries) {
    if (!currentMap.has(base.id)) {
      deletedCount++;
    }
  }

  // Also check if new IDs were added to deletedEntryIds
  const currentDeletedSet = new Set(current.deletedEntryIds || []);
  const baselineDeletedSet = new Set(baseline.deletedEntryIds || []);
  const newlyDeletedIds = (current.deletedEntryIds || []).filter(id => !baselineDeletedSet.has(id));
  if (newlyDeletedIds.length > 0 && deletedCount === 0) {
    deletedCount += newlyDeletedIds.length;
  }

  if (addedCount > 0) {
    summary.push(`${addedCount} new ${addedCount === 1 ? 'entry' : 'entries'} added`);
  }
  if (modifiedCount > 0) {
    summary.push(`${modifiedCount} existing ${modifiedCount === 1 ? 'entry' : 'entries'} edited`);
  }
  if (deletedCount > 0) {
    summary.push(`${deletedCount} ${deletedCount === 1 ? 'entry' : 'entries'} deleted`);
  }

  const hasChanges = versionChanged || repoChanged || addedCount > 0 || modifiedCount > 0 || deletedCount > 0;

  return {
    hasChanges,
    summary,
    addedCount,
    modifiedCount,
    deletedCount,
    versionChanged,
    repoChanged
  };
}

/**
 * Persist the changelog to Cloud Firestore and sync local storage baseline.
 */
export async function persistChangelogConfigToFirestore(
  config: ChangelogConfig,
  commitMessage?: string
): Promise<{ success: boolean; quotaExceeded?: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'ecosystem', CHANGELOG_FIRESTORE_DOC);
    
    // Ensure all entries marked as deleted are strictly excluded from entries array
    const deletedSet = new Set(config.deletedEntryIds || []);
    const cleanEntries = (config.entries || []).filter(e => !deletedSet.has(e.id));

    const cleanConfig = sanitizeForFirestore({
      ...config,
      entries: cleanEntries,
      deletedEntryIds: Array.from(deletedSet)
    });

    const payload = {
      ...cleanConfig,
      updatedAt: serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
      ...(commitMessage ? { lastCommitMessage: commitMessage } : {})
    };

    await setDoc(docRef, payload);
    const committedCopy: ChangelogConfig = {
      ...config,
      entries: cleanEntries,
      deletedEntryIds: Array.from(deletedSet)
    };
    saveCommittedChangelogBaseline(committedCopy);
    saveChangelogConfig(committedCopy);
    console.info('Successfully persisted changelog configuration to Cloud Firestore.');
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    const isQuota =
      err?.code === 'resource-exhausted' ||
      msg.includes('Quota exceeded') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('quota metric');

    if (isQuota) {
      console.warn('Firestore write quota limit reached. Changelog saved locally on device.', err);
      saveCommittedChangelogBaseline(config);
      saveChangelogConfig(config);
      return { success: false, quotaExceeded: true, error: msg };
    }

    console.error('Failed to persist changelog to Firestore:', err);
    return { success: false, quotaExceeded: false, error: msg };
  }
}

/**
 * Fetch the changelog from Cloud Firestore.
 */
export async function fetchChangelogConfigFromFirestore(): Promise<ChangelogConfig | null> {
  try {
    const docRef = doc(db, 'ecosystem', CHANGELOG_FIRESTORE_DOC);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.entries)) {
        const deletedEntryIds = Array.isArray(data.deletedEntryIds) ? (data.deletedEntryIds as string[]) : [];
        const deletedSet = new Set(deletedEntryIds);
        const filteredEntries = (data.entries as ChangelogItem[]).filter(e => !deletedSet.has(e.id));

        const decoded: ChangelogConfig = {
          appVersion: data.appVersion || DEFAULT_CHANGELOG_CONFIG.appVersion,
          githubRepo: data.githubRepo || DEFAULT_CHANGELOG_CONFIG.githubRepo,
          githubBranch: data.githubBranch || DEFAULT_CHANGELOG_CONFIG.githubBranch,
          lastSyncedAt: data.lastSyncedAt || data.updatedAtIso || new Date().toISOString(),
          entries: filteredEntries,
          deletedEntryIds
        };
        const merged = mergeWithCodeDefaults(decoded);
        saveCommittedChangelogBaseline(merged);
        saveChangelogConfig(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not fetch changelog from Firestore (falling back to local cache):', err);
  }
  return null;
}

/**
 * Subscribe to real-time updates of the changelog from Cloud Firestore.
 * Does NOT resurrect deleted entries on snapshot events.
 */
export function subscribeToChangelogConfig(
  onUpdate: (config: ChangelogConfig) => void
): () => void {
  try {
    const docRef = doc(db, 'ecosystem', CHANGELOG_FIRESTORE_DOC);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        // If local write is still in flight, skip echoing to prevent UI flicker
        if (snap.metadata.hasPendingWrites) {
          return;
        }
        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data.entries)) {
            const deletedEntryIds = Array.isArray(data.deletedEntryIds) ? (data.deletedEntryIds as string[]) : [];
            const deletedSet = new Set(deletedEntryIds);
            const filteredEntries = (data.entries as ChangelogItem[]).filter(e => !deletedSet.has(e.id));

            const decoded: ChangelogConfig = {
              appVersion: data.appVersion || DEFAULT_CHANGELOG_CONFIG.appVersion,
              githubRepo: data.githubRepo || DEFAULT_CHANGELOG_CONFIG.githubRepo,
              githubBranch: data.githubBranch || DEFAULT_CHANGELOG_CONFIG.githubBranch,
              lastSyncedAt: data.lastSyncedAt || data.updatedAtIso || new Date().toISOString(),
              entries: filteredEntries,
              deletedEntryIds
            };
            
            // Live snapshot reflects the exact state in the cloud — do NOT re-merge or resurrect deleted items
            saveCommittedChangelogBaseline(decoded);
            saveChangelogConfig(decoded);
            onUpdate(decoded);
          }
        }
      },
      (error) => {
        console.warn('Changelog Firestore subscription error:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to changelog in Firestore:', err);
    return () => {};
  }
}

/**
 * Automatically records an assistant modification to the changelog and commits it to cloud.
 */
export async function recordAssistantChangelogEntry(
  entry: {
    version?: string;
    title: string;
    changes: string[];
    tag?: ChangelogTag;
    author?: string;
    description?: string;
  }
): Promise<ChangelogConfig> {
  const current = loadChangelogConfig();
  const version = entry.version || current.appVersion || '1.2.3';
  const newId = `assistant-${Date.now()}`;

  const newEntry: ChangelogItem = {
    id: newId,
    version,
    date: new Date().toISOString().split('T')[0],
    title: entry.title,
    description: entry.description,
    changes: entry.changes,
    tag: entry.tag || 'fix',
    author: entry.author || 'AI Studio Assistant',
    source: 'manual'
  };

  const deletedSet = new Set(current.deletedEntryIds || []);
  const filteredCurrent = current.entries.filter(e => !deletedSet.has(e.id));

  // Avoid exact duplicate titles on same day
  const exists = filteredCurrent.some(e => e.title === entry.title && e.version === version);
  let updatedEntries = filteredCurrent;
  if (!exists) {
    updatedEntries = [newEntry, ...filteredCurrent];
  }

  const updatedConfig: ChangelogConfig = {
    ...current,
    appVersion: version,
    entries: updatedEntries,
    deletedEntryIds: Array.from(deletedSet)
  };

  saveChangelogConfig(updatedConfig);
  await persistChangelogConfigToFirestore(updatedConfig, `Auto-logged: ${entry.title}`);
  return updatedConfig;
}

/**
 * Normalizes a GitHub repository string into "owner/repo" format.
 */
export function normalizeGitHubRepo(input: string): string {
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^github\.com\//i, '');
  cleaned = cleaned.replace(/\.git$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

function parseCommitTag(message: string): ChangelogTag {
  const lower = message.toLowerCase();
  if (lower.startsWith('feat') || lower.includes('add ') || lower.includes('feature')) return 'feature';
  if (lower.startsWith('fix') || lower.includes('bug') || lower.includes('patch')) return 'fix';
  if (lower.startsWith('ui') || lower.includes('style') || lower.includes('css')) return 'ui';
  if (lower.startsWith('release') || lower.startsWith('v') || lower.includes('bump version')) return 'release';
  if (lower.includes('ecosystem') || lower.includes('data') || lower.includes('quadrant')) return 'ecosystem';
  return 'update';
}

function cleanCommitTitle(title: string): string {
  return title.replace(/^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert)(\([a-z0-9_-]+\))?:\s*/i, '');
}

export interface GitHubCommitApiItem {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  author?: {
    login: string;
    avatar_url?: string;
  };
}

/**
 * Fetches recent commits from GitHub public repository.
 */
export async function fetchGitHubCommits(
  rawRepo: string,
  branch = 'main',
  customToken?: string
): Promise<{ items: ChangelogItem[]; error?: string }> {
  const envToken = import.meta.env.VITE_GITHUB_TOKEN;
  const token = customToken || (typeof envToken === 'string' && envToken.trim().length > 0 ? envToken.trim() : undefined);

  const repo = normalizeGitHubRepo(rawRepo);
  if (!repo || !repo.includes('/')) {
    return {
      items: [],
      error: 'Invalid GitHub repository format. Please use "owner/repo" (e.g. metta-earth/metta-ecosystem-map).'
    };
  }

  const url = `https://api.github.com/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=15`;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });

    if (res.status === 404) {
      return {
        items: [],
        error: `Repository "${repo}" or branch "${branch}" was not found on GitHub. Check the name and privacy settings.`
      };
    }

    if (res.status === 403) {
      return {
        items: [],
        error: 'GitHub API rate limit exceeded. Please wait a few minutes or authenticate with a token.'
      };
    }

    if (!res.ok) {
      return {
        items: [],
        error: `GitHub API error: HTTP ${res.status} (${res.statusText})`
      };
    }

    const data: GitHubCommitApiItem[] = await res.json();
    if (!Array.isArray(data)) {
      return { items: [], error: 'Unexpected response format from GitHub' };
    }

    const items: ChangelogItem[] = data.map((item, index) => {
      const fullMessage = item.commit.message || '';
      const lines = fullMessage.split('\n').map(l => l.trim()).filter(Boolean);
      const rawTitle = lines[0] || 'Update';
      const title = cleanCommitTitle(rawTitle);
      const restLines = lines.slice(1);
      
      const shortHash = item.sha.substring(0, 7);
      const commitDate = item.commit.author.date
        ? item.commit.author.date.split('T')[0]
        : new Date().toISOString().split('T')[0];

      const tag = parseCommitTag(rawTitle);

      return {
        id: `gh-${item.sha}`,
        version: index === 0 ? `Commit ${shortHash}` : shortHash,
        date: commitDate,
        title: title || rawTitle,
        description: restLines.length > 0 ? restLines[0] : undefined,
        changes: restLines.length > 0 ? restLines : [rawTitle],
        tag,
        author: item.author?.login || item.commit.author.name || 'GitHub Contributor',
        commitHash: shortHash,
        commitUrl: item.html_url,
        source: 'github'
      };
    });

    return { items };
  } catch (err: any) {
    return {
      items: [],
      error: err?.message || 'Network error connecting to GitHub'
    };
  }
}
