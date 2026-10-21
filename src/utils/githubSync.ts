import { ChangelogConfig, ChangelogItem, ChangelogTag } from '../types';

export const CHANGELOG_STORAGE_KEY = 'metta_map_changelog_config_v1';

export const DEFAULT_CHANGELOG_CONFIG: ChangelogConfig = {
  appVersion: '1.2.0',
  githubRepo: 'metta-earth/metta-ecosystem-map',
  githubBranch: 'main',
  lastSyncedAt: new Date().toISOString(),
  entries: [
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

export function loadChangelogConfig(): ChangelogConfig {
  try {
    const raw = localStorage.getItem(CHANGELOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.entries) && parsed.appVersion) {
        return parsed;
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

/**
 * Normalizes a GitHub repository string into "owner/repo" format.
 * Supports:
 * - "owner/repo"
 * - "https://github.com/owner/repo"
 * - "https://github.com/owner/repo.git"
 * - "github.com/owner/repo"
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
  // Remove conventional commit prefix if present (e.g., "feat: Add new feature" -> "Add new feature")
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
  // Use explicitly provided token or fall back to gitignored VITE_GITHUB_TOKEN
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
