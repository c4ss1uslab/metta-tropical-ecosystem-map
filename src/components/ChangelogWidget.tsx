import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  GitCommit, GitBranch, Github, History, Sparkles, ExternalLink, 
  Plus, Trash2, Edit3, Check, X, RefreshCw, AlertCircle, ArrowUpRight,
  Filter, Tag, Search, Calendar, ChevronDown, ChevronUp, CheckCircle2,
  SlidersHorizontal, Wrench, User, CloudUpload, Cloud, CheckCheck
} from 'lucide-react';
import { ChangelogConfig, ChangelogItem, ChangelogTag } from '../types';
import { 
  loadChangelogConfig, 
  saveChangelogConfig, 
  fetchGitHubCommits, 
  normalizeGitHubRepo,
  DEFAULT_CHANGELOG_CONFIG,
  persistChangelogConfigToFirestore,
  fetchChangelogConfigFromFirestore,
  subscribeToChangelogConfig,
  getUncommittedChangelogDiff,
  loadCommittedChangelogBaseline,
  saveCommittedChangelogBaseline
} from '../utils/githubSync';

interface ChangelogWidgetProps {
  editMode: boolean;
}

const TAG_STYLES: Record<ChangelogTag, { bg: string; text: string; border: string; label: string }> = {
  feature: { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]', border: 'border-[#BBF7D0]', label: 'Feature' },
  fix: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', border: 'border-[#FECACA]', label: 'Fix' },
  update: { bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]', border: 'border-[#BFDBFE]', label: 'Update' },
  release: { bg: 'bg-[#F3E8FF]', text: 'text-[#6B21A8]', border: 'border-[#E9D5FF]', label: 'Release' },
  ecosystem: { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#FDE68A]', label: 'Ecosystem' },
  ui: { bg: 'bg-[#F4F4F5]', text: 'text-[#27272A]', border: 'border-[#E4E4E7]', label: 'UI' }
};

export const ChangelogWidget: React.FC<ChangelogWidgetProps> = ({ editMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ChangelogConfig>(() => loadChangelogConfig());
  const [committedBaseline, setCommittedBaseline] = useState<ChangelogConfig>(() => loadCommittedChangelogBaseline());
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // GitHub syncing states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Cloud commit states
  const [isCommittingToCloud, setIsCommittingToCloud] = useState(false);
  const [cloudCommitSuccessMsg, setCloudCommitSuccessMsg] = useState<string | null>(null);
  const [cloudCommitError, setCloudCommitError] = useState<string | null>(null);

  // Widget edit mode override (allows authoring directly from changelog modal even if global map edit mode is off)
  const [widgetEditOverride, setWidgetEditOverride] = useState(false);
  const effectiveEditMode = editMode || widgetEditOverride;

  // Edit Mode state
  const [isEditingVersion, setIsEditingVersion] = useState(false);
  const [versionInput, setVersionInput] = useState(config.appVersion);
  const [isEditingRepo, setIsEditingRepo] = useState(false);
  const [repoInput, setRepoInput] = useState(config.githubRepo);
  const [branchInput, setBranchInput] = useState(config.githubBranch || 'main');

  // New entry form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVersion, setNewVersion] = useState(config.appVersion);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTag, setNewTag] = useState<ChangelogTag>('feature');
  const [newChangesText, setNewChangesText] = useState('');
  const [newAuthor, setNewAuthor] = useState('');

  // Editing existing entry state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTag, setEditTag] = useState<ChangelogTag>('feature');
  const [editAuthor, setEditAuthor] = useState('');
  const [editChangesText, setEditChangesText] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Calculate uncommitted differences against the last committed cloud baseline
  const diff = useMemo(() => {
    return getUncommittedChangelogDiff(config, committedBaseline);
  }, [config, committedBaseline]);

  // Load from Cloud Firestore on mount & subscribe to real-time updates
  useEffect(() => {
    let isMounted = true;

    fetchChangelogConfigFromFirestore().then((cloudConfig) => {
      if (!isMounted) return;
      if (cloudConfig) {
        setConfig(cloudConfig);
        setCommittedBaseline(cloudConfig);
      } else {
        // If no remote doc exists yet, seed initial default config to Firestore
        persistChangelogConfigToFirestore(DEFAULT_CHANGELOG_CONFIG);
        setCommittedBaseline(DEFAULT_CHANGELOG_CONFIG);
      }
    });

    const unsubscribe = subscribeToChangelogConfig((remoteConfig) => {
      if (!isMounted) return;
      setConfig(remoteConfig);
      setCommittedBaseline(remoteConfig);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Stop native wheel propagation from popover to map canvas so map never zooms/redimensions when scrolling over changelog
  useEffect(() => {
    const popoverEl = popoverRef.current;
    if (!popoverEl || !isOpen) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.stopPropagation();
    };

    popoverEl.addEventListener('wheel', handleNativeWheel, { passive: true });
    return () => {
      popoverEl.removeEventListener('wheel', handleNativeWheel);
    };
  }, [isOpen]);

  // Sync inputs with config updates
  useEffect(() => {
    setVersionInput(config.appVersion);
    setRepoInput(config.githubRepo);
    setBranchInput(config.githubBranch || 'main');
    saveChangelogConfig(config);
  }, [config]);

  // Click outside and escape handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Trigger Cloud Commit
  const handleCommitToCloud = async () => {
    if (isCommittingToCloud) return;
    setIsCommittingToCloud(true);
    setCloudCommitError(null);
    setCloudCommitSuccessMsg(null);

    const deletedSet = new Set(config.deletedEntryIds || []);
    const cleanEntries = (config.entries || []).filter(e => !deletedSet.has(e.id));
    const configToPersist: ChangelogConfig = {
      ...config,
      entries: cleanEntries,
      deletedEntryIds: Array.from(deletedSet)
    };

    const res = await persistChangelogConfigToFirestore(
      configToPersist,
      `User committed changes: ${diff.summary.join(', ') || 'Changelog update'}`
    );
    setIsCommittingToCloud(false);

    if (res.success) {
      const cloned = JSON.parse(JSON.stringify(configToPersist));
      setConfig(cloned);
      setCommittedBaseline(cloned);
      saveCommittedChangelogBaseline(cloned);
      setCloudCommitSuccessMsg(
        diff.summary.length > 0
          ? `Changes committed to Cloud Firestore! (${diff.summary.join(', ')})`
          : 'Changelog successfully synchronized with Cloud Firestore!'
      );
      setTimeout(() => setCloudCommitSuccessMsg(null), 6000);
    } else if (res.quotaExceeded) {
      setCloudCommitError('Daily cloud write quota reached. Changes are saved locally on this device.');
    } else {
      setCloudCommitError(res.error || 'Failed to commit to cloud. Please try again.');
    }
  };

  // Trigger GitHub sync
  const handleSyncGitHub = async (customRepo?: string, customBranch?: string) => {
    const repoToUse = customRepo || config.githubRepo;
    const branchToUse = customBranch || config.githubBranch || 'main';

    if (!repoToUse) {
      setSyncError('Please specify a GitHub repository (e.g. owner/repo).');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMsg(null);

    const result = await fetchGitHubCommits(repoToUse, branchToUse);

    setIsSyncing(false);

    if (result.error) {
      setSyncError(result.error);
      return;
    }

    if (result.items.length === 0) {
      setSyncError('No commits found in the specified repository branch.');
      return;
    }

    // Merge GitHub commits with existing manual entries without duplicate hashes
    setConfig(prev => {
      const existingHashes = new Set(prev.entries.filter(e => e.commitHash).map(e => e.commitHash));
      const newItems = result.items.filter(item => !existingHashes.has(item.commitHash));

      const updatedEntries = [...newItems, ...prev.entries];
      const newConfig: ChangelogConfig = {
        ...prev,
        githubRepo: normalizeGitHubRepo(repoToUse),
        githubBranch: branchToUse,
        lastSyncedAt: new Date().toISOString(),
        entries: updatedEntries
      };
      saveChangelogConfig(newConfig);
      return newConfig;
    });

    setSyncSuccessMsg(`Retrieved ${result.items.length} commits from GitHub! Click 'Commit to Cloud' to persist.`);
    setTimeout(() => setSyncSuccessMsg(null), 6000);
  };

  // Save edited app version
  const handleSaveVersion = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = versionInput.trim();
    if (!trimmed) return;
    setConfig(prev => ({ ...prev, appVersion: trimmed }));
    setIsEditingVersion(false);
  };

  // Save edited repository info
  const handleSaveRepo = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = normalizeGitHubRepo(repoInput);
    const branch = branchInput.trim() || 'main';
    setConfig(prev => ({
      ...prev,
      githubRepo: clean,
      githubBranch: branch
    }));
    setIsEditingRepo(false);
    handleSyncGitHub(clean, branch);
  };

  // Add new manual entry
  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const changes = newChangesText
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);

    const newEntry: ChangelogItem = {
      id: `manual-${Date.now()}`,
      version: newVersion.trim() || config.appVersion,
      date: new Date().toISOString().split('T')[0],
      title: newTitle.trim(),
      description: newDescription.trim() ? newDescription.trim() : undefined,
      changes: changes.length > 0 ? changes : [newTitle.trim()],
      tag: newTag,
      author: newAuthor.trim() || 'Contributor',
      source: 'manual'
    };

    setConfig(prev => ({
      ...prev,
      entries: [newEntry, ...prev.entries]
    }));

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewChangesText('');
    setNewAuthor('');
    setShowAddForm(false);
  };

  // Start editing existing entry
  const handleStartEditItem = (item: ChangelogItem) => {
    setEditingItemId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setEditVersion(item.version);
    setEditDate(item.date);
    setEditTag(item.tag || 'feature');
    setEditAuthor(item.author || '');
    setEditChangesText(item.changes.join('\n'));
  };

  // Save edited item
  const handleSaveEditItem = (id: string) => {
    const changes = editChangesText
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);

    setConfig(prev => {
      const updatedEntries = prev.entries.map(item => {
        if (item.id === id) {
          return {
            ...item,
            title: editTitle.trim() || item.title,
            description: editDescription.trim() ? editDescription.trim() : undefined,
            version: editVersion.trim() || item.version,
            date: editDate.trim() || item.date,
            author: editAuthor.trim() || item.author || 'Contributor',
            tag: editTag,
            changes: changes.length > 0 ? changes : [editTitle.trim()]
          };
        }
        return item;
      });
      const newConfig: ChangelogConfig = {
        ...prev,
        entries: updatedEntries
      };
      saveChangelogConfig(newConfig);
      return newConfig;
    });

    setEditingItemId(null);
  };

  // Delete item permanently
  const handleDeleteItem = (id: string) => {
    setConfig(prev => {
      const updatedEntries = prev.entries.filter(e => e.id !== id);
      const prevDeleted = prev.deletedEntryIds || [];
      const updatedDeleted = prevDeleted.includes(id) ? prevDeleted : [...prevDeleted, id];
      const newConfig: ChangelogConfig = {
        ...prev,
        entries: updatedEntries,
        deletedEntryIds: updatedDeleted
      };
      saveChangelogConfig(newConfig);
      return newConfig;
    });
    setDeletingItemId(null);
    if (editingItemId === id) {
      setEditingItemId(null);
    }
  };

  // Reset to default changelog
  const handleResetDefaults = () => {
    const resetConfig: ChangelogConfig = {
      ...DEFAULT_CHANGELOG_CONFIG,
      deletedEntryIds: []
    };
    setConfig(resetConfig);
    saveChangelogConfig(resetConfig);
    setIsConfirmingReset(false);
  };

  // Filter entries
  const filteredEntries = config.entries.filter(item => {
    if (activeFilter !== 'all') {
      if (activeFilter === 'github' && item.source !== 'github') return false;
      if (activeFilter === 'manual' && item.source === 'github') return false;
      if (activeFilter !== 'github' && activeFilter !== 'manual' && item.tag !== activeFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchVersion = item.version.toLowerCase().includes(q);
      const matchAuthor = item.author?.toLowerCase().includes(q);
      const matchChanges = item.changes.some(c => c.toLowerCase().includes(q));
      return matchTitle || matchVersion || matchAuthor || matchChanges;
    }

    return true;
  });

  return (
    <div ref={panelRef} className="changelog-widget-container relative select-none pointer-events-auto">
      {/* Floating Trigger Button in bottom-right corner */}
      <button
        id="map-changelog-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-[4px] border shadow-md transition-all cursor-pointer ${
          isOpen
            ? 'bg-[#111827] text-white border-[#111827]'
            : 'bg-white/95 backdrop-blur-xs text-[#111827] border-[#E5E7EB] hover:border-[#111827] hover:bg-white'
        }`}
        title={diff.hasChanges ? 'View Changelog (Uncommitted changes pending)' : 'View Metta Map Changelog & Latest Changes'}
        aria-label="View Changelog"
      >
        <span className="flex items-center space-x-1.5">
          <GitCommit className={`w-3.5 h-3.5 ${diff.hasChanges ? 'text-amber-500' : isOpen ? 'text-[#D9C01B]' : 'text-[#059669]'}`} />
          <span className="font-technical text-[11px] font-bold tracking-tight">
            v{config.appVersion}
          </span>
        </span>

        <span className={`w-1 h-3 border-r ${isOpen ? 'border-white/20' : 'border-[#E5E7EB]'}`} />

        <span className="font-sans text-[11px] font-medium hidden xs:inline-block">
          Changelog
        </span>

        {/* Uncommitted changes pending indicator dot */}
        {diff.hasChanges && (
          <span 
            className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white shrink-0 animate-pulse ml-0.5" 
            title="Uncommitted changes pending sync to cloud" 
          />
        )}

        {effectiveEditMode && (
          <span className="bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[9px] font-technical uppercase font-bold px-1 py-0.2 rounded-[2px] ml-1">
            Edit
          </span>
        )}
      </button>

      {/* Popover Changelog Card */}
      {isOpen && (
        <div
          ref={popoverRef}
          id="map-changelog-panel"
          onWheel={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className="absolute bottom-11 right-0 w-[calc(100vw-32px)] sm:w-[500px] max-h-[82vh] bg-white border border-[#E5E7EB] rounded-[6px] shadow-2xl z-40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 text-[#111827] overscroll-contain select-text"
        >
          {/* Header */}
          <div className="p-3.5 bg-[#FAF8F5] border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-[4px] bg-[#111827] flex items-center justify-center text-[#D9C01B] shrink-0">
                <GitBranch className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-editorial text-sm font-bold text-[#111827] leading-tight">
                    Map Changelog
                  </h3>
                  {/* Version Pill */}
                  {!isEditingVersion ? (
                    <span 
                      onClick={() => effectiveEditMode && setIsEditingVersion(true)}
                      className={`font-technical text-[10px] px-1.5 py-0.5 rounded-[3px] font-bold border transition-colors ${
                        effectiveEditMode 
                          ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] cursor-pointer hover:border-[#92400E]' 
                          : 'bg-white text-[#111827] border-[#E5E7EB]'
                      }`}
                      title={effectiveEditMode ? 'Click to edit app version' : `Version ${config.appVersion}`}
                    >
                      v{config.appVersion} {effectiveEditMode && '✏️'}
                    </span>
                  ) : (
                    <form onSubmit={handleSaveVersion} className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={versionInput}
                        onChange={(e) => setVersionInput(e.target.value)}
                        className="w-16 px-1.5 py-0.5 text-[10px] font-technical border border-[#111827] rounded-[2px] outline-none bg-white"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="p-0.5 bg-[#111827] text-white rounded-[2px] hover:bg-[#374151] cursor-pointer"
                        title="Save version"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingVersion(false)}
                        className="p-0.5 text-[#8C877F] hover:text-[#111827] cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </form>
                  )}
                </div>
                <p className="font-technical text-[9px] text-[#716C64] uppercase tracking-wider mt-0.5">
                  Releases, GitHub Commits & Cloud Sync
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center space-x-1.5">
              {/* Unlock Changelog Editing toggle button when global editMode is false */}
              {!editMode && (
                <button
                  type="button"
                  onClick={() => setWidgetEditOverride(!widgetEditOverride)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-[3px] text-[10px] font-technical font-bold border transition-all cursor-pointer ${
                    widgetEditOverride
                      ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] shadow-xs'
                      : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:text-[#111827] hover:border-[#111827]'
                  }`}
                  title={widgetEditOverride ? 'Lock Changelog Editing' : 'Unlock Changelog Editing to customize titles, subtitles, and entries'}
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  <span>{widgetEditOverride ? 'Editing Unlocked' : 'Edit Changelog'}</span>
                </button>
              )}
              {/* Quick Commit button in header if uncommitted changes exist */}
              {diff.hasChanges && (
                <button
                  type="button"
                  onClick={handleCommitToCloud}
                  disabled={isCommittingToCloud}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-[#059669] hover:bg-[#047857] text-white rounded-[3px] text-[10px] font-technical font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  title="Commit changes to Cloud Firestore"
                >
                  <CloudUpload className={`w-3 h-3 ${isCommittingToCloud ? 'animate-bounce' : ''}`} />
                  <span>{isCommittingToCloud ? 'Committing...' : 'Commit'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSyncGitHub()}
                disabled={isSyncing}
                className="p-1.5 rounded-[3px] text-[#4B5563] hover:text-[#111827] hover:bg-white border border-transparent hover:border-[#E5E7EB] transition-colors cursor-pointer"
                title="Sync latest changes from GitHub repository"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#059669]' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-[3px] text-[#8C877F] hover:text-[#111827] hover:bg-white border border-transparent hover:border-[#E5E7EB] transition-colors cursor-pointer"
                aria-label="Close Changelog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* UNCOMMITTED CHANGES IDENTIFIED BANNER */}
          {diff.hasChanges && (
            <div className="px-3.5 py-2.5 bg-[#FFFBEB] border-b border-[#FDE68A] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 animate-in fade-in duration-150">
              <div className="flex items-start space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-0.5 shrink-0 animate-ping" />
                <div className="text-xs">
                  <span className="font-technical font-bold text-[#92400E] block leading-tight">
                    Uncommitted Changes Identified ({diff.summary.length})
                  </span>
                  <p className="font-sans text-[11px] text-[#78350F] leading-snug mt-0.5">
                    {diff.summary.join(' • ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCommitToCloud}
                disabled={isCommittingToCloud}
                className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-[3px] text-xs font-sans font-bold shadow-xs cursor-pointer transition-all shrink-0 disabled:opacity-50"
                title="Commit these changelog updates directly to Cloud Firestore"
              >
                <CloudUpload className={`w-3.5 h-3.5 ${isCommittingToCloud ? 'animate-bounce' : ''}`} />
                <span>{isCommittingToCloud ? 'Committing...' : 'Commit to Cloud'}</span>
              </button>
            </div>
          )}

          {/* Cloud Commit Success / Error Feedback */}
          {cloudCommitSuccessMsg && (
            <div className="px-3.5 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between shrink-0 animate-in fade-in duration-150">
              <div className="flex items-center space-x-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium truncate">{cloudCommitSuccessMsg}</span>
              </div>
              <button 
                type="button"
                onClick={() => setCloudCommitSuccessMsg(null)}
                className="text-emerald-600 hover:text-emerald-900 ml-2"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {cloudCommitError && (
            <div className="px-3.5 py-2 bg-red-50 border-b border-red-200 text-red-700 text-[11px] flex items-center justify-between shrink-0 animate-in fade-in duration-150">
              <div className="flex items-center space-x-1.5 truncate">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="truncate">{cloudCommitError}</span>
              </div>
              <button 
                type="button"
                onClick={() => setCloudCommitError(null)}
                className="text-red-600 hover:text-red-900 ml-2"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* GitHub Connection & Repository Bar */}
          <div className="px-3 py-2 bg-[#FAF8F5]/60 border-b border-[#E5E7EB] flex flex-col space-y-1.5 shrink-0 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center space-x-1.5 truncate max-w-[280px]">
                <Github className="w-3.5 h-3.5 text-[#111827] shrink-0" />
                <span className="text-[#6B7280]">Repository:</span>
                <a
                  href={`https://github.com/${config.githubRepo}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-technical font-bold text-[#111827] hover:underline truncate inline-flex items-center gap-0.5"
                  title="Open repository on GitHub"
                >
                  <span>{config.githubRepo}</span>
                  <ExternalLink className="w-2.5 h-2.5 inline-block opacity-60" />
                </a>
              </div>

              <div className="flex items-center space-x-2">
                {/* Cloud sync status indicator */}
                {!diff.hasChanges && (
                  <span className="font-technical text-[9.5px] text-[#059669] flex items-center gap-1 font-semibold">
                    <CheckCheck className="w-3 h-3" />
                    <span className="hidden sm:inline">Cloud Synced</span>
                  </span>
                )}

                {effectiveEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditingRepo(!isEditingRepo)}
                    className="font-technical text-[10px] text-[#059669] hover:underline font-bold cursor-pointer"
                  >
                    {isEditingRepo ? 'Close' : 'Change Repo'}
                  </button>
                )}
              </div>
            </div>

            {/* Editable repo form in edit mode */}
            {isEditingRepo && effectiveEditMode && (
              <form onSubmit={handleSaveRepo} className="p-2 bg-white border border-[#E5E7EB] rounded-[4px] space-y-2 mt-1">
                <div className="space-y-1">
                  <label className="font-technical text-[9px] text-[#6B7280] uppercase">GitHub Repo (owner/repo):</label>
                  <input
                    type="text"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="e.g. metta-earth/metta-ecosystem-map"
                    className="w-full text-xs font-technical px-2 py-1 border border-[#E5E7EB] rounded-[3px] outline-none focus:border-[#111827]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-technical text-[9px] text-[#6B7280] uppercase">Branch:</label>
                  <input
                    type="text"
                    value={branchInput}
                    onChange={(e) => setBranchInput(e.target.value)}
                    placeholder="main"
                    className="w-full text-xs font-technical px-2 py-1 border border-[#E5E7EB] rounded-[3px] outline-none focus:border-[#111827]"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingRepo(false)}
                    className="px-2 py-1 text-[10px] border border-[#E5E7EB] rounded-[3px] hover:bg-[#FAF8F5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[10px] bg-[#111827] text-white rounded-[3px] font-medium hover:bg-[#374151]"
                  >
                    Save & Sync
                  </button>
                </div>
              </form>
            )}

            {/* Feedback messages */}
            {syncError && (
              <div className="p-1.5 bg-red-50 border border-red-200 rounded-[3px] text-red-700 text-[10px] flex items-center space-x-1.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className="truncate">{syncError}</span>
              </div>
            )}
            {syncSuccessMsg && (
              <div className="p-1.5 bg-green-50 border border-green-200 rounded-[3px] text-green-700 text-[10px] flex items-center space-x-1.5">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>{syncSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* Edit Mode Banner & Actions */}
          {effectiveEditMode && (
            <div className="px-3 py-2 bg-[#FFFBEB] border-b border-[#FDE68A] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-1.5 text-[10px] text-[#92400E] font-medium">
                <Wrench className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">Edit Mode: You can author releases & edit logs.</span>
                <span className="sm:hidden">Edit Mode Active</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {/* Commit to cloud button inside edit banner */}
                <button
                  type="button"
                  onClick={handleCommitToCloud}
                  disabled={isCommittingToCloud || !diff.hasChanges}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-[3px] text-[10px] font-technical font-bold transition-all cursor-pointer ${
                    diff.hasChanges
                      ? 'bg-[#059669] hover:bg-[#047857] text-white shadow-xs'
                      : 'bg-white/80 text-[#6B7280] border border-[#E5E7EB] opacity-60 cursor-not-allowed'
                  }`}
                  title={diff.hasChanges ? 'Commit changes to Cloud Firestore' : 'All changes already synchronized with Cloud Firestore'}
                >
                  <CloudUpload className={`w-3 h-3 ${isCommittingToCloud ? 'animate-bounce' : ''}`} />
                  <span>
                    {isCommittingToCloud 
                      ? 'Committing...' 
                      : diff.hasChanges 
                        ? `Commit (${diff.summary.length})` 
                        : 'Cloud Synced'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center space-x-1 px-2 py-1 bg-[#111827] text-white rounded-[3px] text-[10px] font-sans font-medium hover:bg-[#374151] cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#D9C01B]" />
                  <span>{showAddForm ? 'Cancel' : 'New Entry'}</span>
                </button>
                {isConfirmingReset ? (
                  <div className="flex items-center space-x-1 bg-white border border-[#FDE68A] px-1.5 py-0.5 rounded-[3px] text-[9.5px] font-technical shadow-xs">
                    <span className="text-[#92400E] font-medium">Reset all?</span>
                    <button
                      type="button"
                      onClick={handleResetDefaults}
                      className="text-red-600 font-bold hover:underline cursor-pointer"
                      title="Confirm reset"
                    >
                      Yes
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingReset(false)}
                      className="text-[#6B7280] hover:text-[#111827] cursor-pointer"
                      title="Cancel reset"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingReset(true)}
                    className="px-1.5 py-1 text-[10px] text-[#716C64] hover:text-[#111827] hover:underline cursor-pointer"
                    title="Restore default changelog entries"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Add New Entry Form (Edit Mode) */}
          {showAddForm && effectiveEditMode && (
            <form onSubmit={handleAddEntry} className="p-3 bg-white border-b border-[#E5E7EB] space-y-2.5 shrink-0 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="font-editorial text-xs font-bold text-[#111827]">
                  Add New Changelog Entry
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-[#8C877F] hover:text-[#111827]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5">Version</label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder={config.appVersion || "1.2.2"}
                    className="w-full text-xs font-technical px-2 py-1 border border-[#E5E7EB] rounded-[3px] outline-none focus:border-[#111827]"
                  />
                </div>
                <div>
                  <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5">Tag</label>
                  <select
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value as ChangelogTag)}
                    className="w-full text-xs font-technical px-2 py-1 border border-[#E5E7EB] rounded-[3px] outline-none focus:border-[#111827]"
                  >
                    <option value="feature">Feature</option>
                    <option value="fix">Fix</option>
                    <option value="update">Update</option>
                    <option value="release">Release</option>
                    <option value="ecosystem">Ecosystem</option>
                    <option value="ui">UI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5">Author / Contributor Name</label>
                <div className="relative">
                  <User className="w-3 h-3 text-[#9CA3AF] absolute left-2 top-2" />
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="Author name (e.g. Cassius Carvalho, Metta Team...)"
                    className="w-full text-xs font-sans pl-7 pr-2 py-1 border border-[#E5E7EB] rounded-[3px] outline-none focus:border-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5">Title / Headline</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Added Interactive Filter for Ecotones (Intersections)"
                  className="w-full text-xs font-sans px-2 py-1 border border-[#E5E7EB] rounded-[3px] outline-none focus:border-[#111827]"
                  required
                />
              </div>

              <div>
                <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5 flex items-center justify-between">
                  <span>Subtitle / Overview Description</span>
                  <span className="text-[#9CA3AF] text-[8.5px] font-normal lowercase">(optional summary)</span>
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. First public release of the interactive 2D RPG cartography for system change."
                  rows={2}
                  className="w-full text-xs font-sans p-2 border border-[#E5E7EB] rounded-[3px] outline-none focus:border-[#111827]"
                />
              </div>

              <div>
                <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5">
                  Changes List (one item per line)
                </label>
                <textarea
                  value={newChangesText}
                  onChange={(e) => setNewChangesText(e.target.value)}
                  placeholder="- Added new corridor buttons&#10;- Fixed position anchoring&#10;- Improved rendering performance"
                  rows={3}
                  className="w-full text-xs font-sans p-2 border border-[#E5E7EB] rounded-[3px] outline-none focus:border-[#111827]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2.5 py-1 text-xs font-sans border border-[#E5E7EB] text-[#4B5563] hover:bg-[#FAF8F5] rounded-[3px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-3.5 py-1 bg-[#111827] text-white rounded-[3px] text-xs font-sans font-medium hover:bg-[#374151] disabled:opacity-50 cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          )}

          {/* Search & Tag Filter Bar */}
          <div className="px-3 py-2 border-b border-[#E5E7EB] flex items-center space-x-2 bg-white shrink-0">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search changes, versions, commits..."
                className="w-full text-xs font-sans pl-7 pr-2 py-1 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[3px] outline-none focus:border-[#111827] text-[#111827] placeholder-[#9CA3AF]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex items-center space-x-1 overflow-x-auto text-[10px] font-technical">
              {(['all', 'feature', 'fix', 'release', 'github'] as const).map(filter => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`px-2 py-1 rounded-[3px] transition-colors cursor-pointer uppercase ${
                    activeFilter === filter
                      ? 'bg-[#111827] text-white font-bold'
                      : 'bg-[#FAF8F5] text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline List */}
          <div 
            onWheel={(e) => e.stopPropagation()}
            className="flex-1 overflow-y-auto p-3.5 space-y-4 max-h-[480px] overscroll-contain"
          >
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-[#8C877F]">
                <History className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="font-editorial text-xs font-medium text-[#111827]">No changelog items found</p>
                <p className="font-sans text-[11px] text-[#6B7280] mt-0.5">
                  Try adjusting your search or sync with GitHub.
                </p>
              </div>
            ) : (
              <div className="relative border-l-2 border-[#E5E7EB] ml-3 pl-4 space-y-5">
                {filteredEntries.map((item) => {
                  const tagInfo = TAG_STYLES[item.tag || 'update'] || TAG_STYLES.update;
                  const isEditingThis = editingItemId === item.id;

                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-[#111827] flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-[#111827]" />
                      </div>

                      {/* Entry Content */}
                      {isEditingThis ? (
                        /* Inline Editor */
                        <div className="p-3 bg-[#FAF8F5] border border-[#111827] rounded-[4px] space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5">Version</label>
                              <input
                                type="text"
                                value={editVersion}
                                onChange={(e) => setEditVersion(e.target.value)}
                                placeholder="Version"
                                className="w-full text-xs font-technical px-2 py-1 border border-[#E5E7EB] rounded bg-white outline-none focus:border-[#111827]"
                              />
                            </div>
                            <div>
                              <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5">Date</label>
                              <input
                                type="text"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                placeholder="YYYY-MM-DD"
                                className="w-full text-xs font-technical px-2 py-1 border border-[#E5E7EB] rounded bg-white outline-none focus:border-[#111827]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5">Author</label>
                              <div className="relative">
                                <User className="w-3 h-3 text-[#9CA3AF] absolute left-2 top-2" />
                                <input
                                  type="text"
                                  value={editAuthor}
                                  onChange={(e) => setEditAuthor(e.target.value)}
                                  placeholder="Author name"
                                  className="w-full text-xs font-sans pl-7 pr-2 py-1 border border-[#E5E7EB] rounded bg-white outline-none focus:border-[#111827]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5">Tag</label>
                              <select
                                value={editTag}
                                onChange={(e) => setEditTag(e.target.value as ChangelogTag)}
                                className="w-full text-xs font-technical px-2 py-1 border border-[#E5E7EB] rounded bg-white outline-none focus:border-[#111827]"
                              >
                                <option value="feature">Feature</option>
                                <option value="fix">Fix</option>
                                <option value="update">Update</option>
                                <option value="release">Release</option>
                                <option value="ecosystem">Ecosystem</option>
                                <option value="ui">UI</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5">Title / Headline</label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Title"
                              className="w-full text-xs font-sans px-2 py-1 border border-[#E5E7EB] rounded bg-white font-bold outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5 flex items-center justify-between">
                              <span>Subtitle / Description (Overview)</span>
                              <span className="text-[#9CA3AF] text-[8.5px] font-normal lowercase">(summary shown beneath title)</span>
                            </label>
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="e.g. First public release of the interactive 2D RPG cartography for system change."
                              rows={2}
                              className="w-full text-xs font-sans p-2 border border-[#E5E7EB] rounded bg-white outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[9px] text-[#6B7280] uppercase block mb-0.5">Changes (one per line)</label>
                            <textarea
                              value={editChangesText}
                              onChange={(e) => setEditChangesText(e.target.value)}
                              rows={3}
                              className="w-full text-xs font-sans p-2 border border-[#E5E7EB] rounded bg-white outline-none focus:border-[#111827]"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            {deletingItemId === item.id ? (
                              <div className="flex items-center space-x-1.5 bg-red-50 border border-red-200 px-2 py-1 rounded-[3px]">
                                <span className="text-[10px] font-technical font-bold text-red-700">Delete this entry?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[9.5px] font-technical font-bold cursor-pointer transition-colors"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingItemId(null)}
                                  className="px-2 py-0.5 bg-white border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] rounded text-[9.5px] font-technical cursor-pointer transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingItemId(item.id)}
                                className="flex items-center space-x-1 px-2 py-1 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded font-technical cursor-pointer transition-colors"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete Entry</span>
                              </button>
                            )}

                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(null);
                                  setDeletingItemId(null);
                                }}
                                className="px-2 py-1 text-[10px] border border-[#E5E7EB] rounded hover:bg-[#FAF8F5] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditItem(item.id)}
                                className="px-2.5 py-1 text-[10px] bg-[#111827] text-white rounded font-medium hover:bg-[#374151] cursor-pointer"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Normal View */
                        <div className="space-y-1.5">
                          {/* Item Header */}
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <div className="flex items-center space-x-1.5">
                              {/* Version or commit badge */}
                              <span className="font-technical text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[#111827] text-white">
                                {item.version.startsWith('v') ? item.version : item.version.startsWith('Commit') ? item.version : `v${item.version}`}
                              </span>

                              {/* Tag badge */}
                              <span className={`font-technical text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-[2px] border ${tagInfo.bg} ${tagInfo.text} ${tagInfo.border}`}>
                                {tagInfo.label}
                              </span>

                              {item.source === 'github' && (
                                <span className="font-technical text-[9px] px-1 py-0.2 rounded-[2px] bg-[#FAF8F5] text-[#6B7280] border border-[#E5E7EB] flex items-center gap-0.5">
                                  <Github className="w-2.5 h-2.5" />
                                  <span>GitHub</span>
                                </span>
                              )}
                            </div>

                            {/* Date & Actions */}
                            <div className="flex items-center space-x-1.5 text-[10px] font-technical text-[#8C877F]">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-2.5 h-2.5" />
                                <span>{item.date}</span>
                              </span>

                              {effectiveEditMode && (
                                <div className={`flex items-center space-x-1 ml-1 transition-opacity ${
                                  deletingItemId === item.id ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
                                }`}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEditItem(item);
                                      setDeletingItemId(null);
                                    }}
                                    className="p-1 hover:text-[#111827] hover:bg-[#FAF8F5] text-[#4B5563] rounded cursor-pointer transition-colors"
                                    title="Edit entry"
                                    aria-label={`Edit entry ${item.title}`}
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                  </button>

                                  {deletingItemId === item.id ? (
                                    <div className="flex items-center space-x-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-[3px] animate-in fade-in duration-100">
                                      <span className="text-[9px] font-technical font-bold text-red-700">Delete?</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteItem(item.id);
                                        }}
                                        className="px-1.5 py-0.2 bg-red-600 hover:bg-red-700 text-white text-[9px] font-technical font-bold rounded cursor-pointer transition-colors"
                                        title="Confirm delete"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingItemId(null);
                                        }}
                                        className="px-1.5 py-0.2 bg-white hover:bg-[#FAF8F5] text-[#4B5563] text-[9px] font-technical border border-[#E5E7EB] rounded cursor-pointer transition-colors"
                                        title="Cancel delete"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingItemId(item.id);
                                      }}
                                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer transition-colors"
                                      title="Delete entry"
                                      aria-label={`Delete entry ${item.title}`}
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="font-editorial text-xs font-bold text-[#111827] leading-snug">
                            {item.title}
                          </h4>

                          {/* Subtitle / Description */}
                          {item.description ? (
                            <div
                              onClick={() => {
                                if (effectiveEditMode) {
                                  handleStartEditItem(item);
                                }
                              }}
                              className={`font-sans text-[11px] leading-relaxed transition-colors ${
                                effectiveEditMode
                                  ? 'cursor-pointer hover:bg-amber-50/80 p-1 -mx-1 rounded border border-transparent hover:border-amber-200 text-[#374151] group/desc'
                                  : 'text-[#4B5563]'
                              }`}
                              title={effectiveEditMode ? 'Click to edit subtitle / description and entry' : undefined}
                            >
                              <span>{item.description}</span>
                              {effectiveEditMode && (
                                <span className="inline-flex items-center ml-1.5 text-[9.5px] font-technical text-[#059669] opacity-75 group-hover/desc:opacity-100 font-semibold">
                                  <Edit3 className="w-2.5 h-2.5 inline mr-0.5" />
                                  Edit subtitle
                                </span>
                              )}
                            </div>
                          ) : (
                            effectiveEditMode && (
                              <button
                                type="button"
                                onClick={() => handleStartEditItem(item)}
                                className="inline-flex items-center space-x-1 text-[10px] font-technical text-[#059669] hover:text-[#047857] hover:underline cursor-pointer pt-0.5"
                                title="Add subtitle/description to this entry"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Add Subtitle / Description</span>
                              </button>
                            )
                          )}

                          {/* Changes Bullet List */}
                          {item.changes && item.changes.length > 0 && (
                            <ul className="space-y-1 pt-0.5">
                              {item.changes.map((change, idx) => (
                                <li key={idx} className="font-sans text-[11px] text-[#374151] flex items-start space-x-1.5 leading-snug">
                                  <span className="text-[#059669] font-bold text-xs shrink-0 select-none">•</span>
                                  <span>{change}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Author & Commit Link Footer */}
                          <div className="flex items-center justify-between pt-1 text-[10px] font-technical text-[#8C877F]">
                            {item.author && (
                              <span className="truncate">
                                by {item.author}
                              </span>
                            )}

                            {item.commitUrl && item.commitHash && (
                              <a
                                href={item.commitUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center space-x-1 text-[#059669] hover:underline font-bold ml-auto"
                                title="View commit on GitHub"
                              >
                                <span>{item.commitHash}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 bg-[#FAF8F5] border-t border-[#E5E7EB] flex items-center justify-between text-[10px] font-technical text-[#8C877F] shrink-0">
            <span className="truncate">
              {config.entries.length} recorded releases & commits
            </span>
            <div className="flex items-center space-x-2">
              {diff.hasChanges ? (
                <span className="text-amber-700 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Uncommitted changes
                </span>
              ) : (
                <span className="text-[#059669] font-medium flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" />
                  Cloud Synced
                </span>
              )}
              <span className="text-[#D1D5DB]">|</span>
              <span className="text-[#6B7280]">
                {effectiveEditMode ? 'Edit Mode: Unlocked' : 'Read-Only View'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
