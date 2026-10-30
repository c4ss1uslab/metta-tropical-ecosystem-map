import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, Trash2, Ban, Search, ExternalLink, Calendar, Mail, 
  ArrowRight, Sparkles, Filter, Download, AlertCircle, RefreshCw, Eye
} from 'lucide-react';
import { EcosystemEntity, ContributionSubmission, FieldDiff, EntityType } from '../types';
import { 
  getStoredContributions, 
  updateContributionStatus, 
  deleteContributionSubmission,
  subscribeToPipelineUpdates
} from '../utils/contributionPipeline';

interface ReviewPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateEntity: (entity: EcosystemEntity) => void;
  onSelectEntity?: (entity: EcosystemEntity) => void;
  entities: EcosystemEntity[];
}

export const ReviewPipelineModal: React.FC<ReviewPipelineModalProps> = ({
  isOpen,
  onClose,
  onUpdateEntity,
  onSelectEntity,
  entities
}) => {
  const [submissions, setSubmissions] = useState<ContributionSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Sync with local storage and subscription
  const refreshSubmissions = () => {
    setSubmissions(getStoredContributions());
  };

  useEffect(() => {
    if (isOpen) {
      refreshSubmissions();
      const unsubscribe = subscribeToPipelineUpdates(refreshSubmissions);
      return () => unsubscribe();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesEntity = sub.entityName.toLowerCase().includes(q);
        const matchesEmail = sub.submitterEmail.toLowerCase().includes(q);
        const matchesDiff = sub.diffs.some(d => 
          d.label.toLowerCase().includes(q) || 
          String(d.newValue).toLowerCase().includes(q)
        );
        return matchesEntity || matchesEmail || matchesDiff;
      }
      return true;
    });
  }, [submissions, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: submissions.length,
      pending: submissions.filter(s => s.status === 'pending').length,
      approved: submissions.filter(s => s.status === 'approved').length,
      rejected: submissions.filter(s => s.status === 'rejected').length
    };
  }, [submissions]);

  const handleApprove = async (submission: ContributionSubmission) => {
    // 1. Find target entity in live dataset to preserve any coordinates or system attributes
    const targetLive = entities.find(e => e.id === submission.entityId);
    
    // Normalize entity type (e.g. 'Org' -> 'Organization')
    const cleanProposed = {
      ...submission.proposedEntity,
      type: ((submission.proposedEntity?.type as any) === 'Org' ? 'Organization' : submission.proposedEntity?.type || 'Organization') as EntityType
    };

    // 2. Merge proposed entity updates onto target, or create new entity if newly proposed
    const updatedEntity: EcosystemEntity = targetLive ? {
      ...targetLive,
      ...cleanProposed,
      // Keep live coordinates if preserved
      x: targetLive.x ?? cleanProposed.x,
      y: targetLive.y ?? cleanProposed.y
    } : {
      ...cleanProposed,
      id: cleanProposed.id || submission.entityId,
      x: typeof cleanProposed.x === 'number' ? cleanProposed.x : 0,
      y: typeof cleanProposed.y === 'number' ? cleanProposed.y : 0
    };

    // 3. Apply to map
    onUpdateEntity(updatedEntity);

    // 4. Mark status in storage & Firestore
    await updateContributionStatus(submission.id, 'approved');
    refreshSubmissions();

    // 5. Notify
    setActionSuccessMsg(
      submission.isNewEntity || !targetLive
        ? `Approved and added new entity "${submission.entityName}" to the live map!`
        : `Approved and merged changes for "${submission.entityName}" into the live map!`
    );
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleReject = async (id: string, entityName: string) => {
    await updateContributionStatus(id, 'rejected');
    refreshSubmissions();
    setActionSuccessMsg(`Marked proposal for "${entityName}" as rejected.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleDelete = async (id: string) => {
    await deleteContributionSubmission(id);
    refreshSubmissions();
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(submissions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `metta_map_contributions_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const renderValuePreview = (val: any) => {
    if (val === undefined || val === null || val === '') {
      return <span className="text-[#9CA3AF] italic text-xs">(empty)</span>;
    }
    if (typeof val === 'boolean') {
      return <span>{val ? 'Yes' : 'No'}</span>;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-[#9CA3AF] italic text-xs">(none)</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {val.map((item, idx) => (
            <span key={idx} className="px-1.5 py-0.5 bg-white border border-[#E5E7EB] rounded text-[11px] font-technical">
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    return <span className="text-xs break-words">{String(val)}</span>;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#111827]/60 backdrop-blur-xs select-text animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-[#E5E7EB] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md bg-[#FAF5E6] border border-[#E2D4A8] flex items-center justify-center text-xl shrink-0">
              🌱
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-editorial text-xl md:text-2xl font-bold text-[#111827]">
                  Community Contributions Pipeline
                </h2>
                {counts.pending > 0 && (
                  <span className="px-2 py-0.5 bg-[#FEF08A] text-[#854D0E] font-technical text-xs font-bold rounded-full">
                    {counts.pending} pending
                  </span>
                )}
              </div>
              <p className="font-sans text-xs text-[#6B7280] mt-0.5">
                Review proposed edits submitted via "Help us improve this data". Approve to merge directly into the live map.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportJson}
              title="Export all submissions as JSON"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#374151] rounded text-xs font-technical transition-all cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8C877F] hover:text-[#111827] hover:bg-white rounded transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action success alert banner */}
        {actionSuccessMsg && (
          <div className="bg-[#ECFDF5] border-b border-[#A7F3D0] px-6 py-2.5 flex items-center space-x-2 text-[#065F46] text-xs font-sans font-medium animate-in fade-in duration-200">
            <Sparkles className="w-4 h-4 text-[#059669] shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-[#E5E7EB] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 w-full sm:w-auto bg-[#F3F4F6] p-1 rounded-md text-xs font-technical">
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded transition-all cursor-pointer font-medium ${
                statusFilter === 'pending'
                  ? 'bg-white text-[#111827] shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Pending ({counts.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1 rounded transition-all cursor-pointer font-medium ${
                statusFilter === 'approved'
                  ? 'bg-white text-[#111827] shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Approved ({counts.approved})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1 rounded transition-all cursor-pointer font-medium ${
                statusFilter === 'rejected'
                  ? 'bg-white text-[#111827] shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Rejected ({counts.rejected})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded transition-all cursor-pointer font-medium ${
                statusFilter === 'all'
                  ? 'bg-white text-[#111827] shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              All ({counts.all})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entity, email, or change..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-[#E5E7EB] focus:border-[#111827] rounded text-xs font-sans outline-none text-[#111827]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Submissions List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#FAF8F5]">
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto text-xl">
                📂
              </div>
              <h3 className="font-editorial text-lg font-bold text-[#111827]">
                {statusFilter === 'pending'
                  ? 'No pending contributions to review'
                  : 'No submissions match your filter'}
              </h3>
              <p className="font-sans text-xs text-[#6B7280] max-w-md mx-auto">
                {statusFilter === 'pending'
                  ? 'When users click "Help us improve this data" in an enlarged entity profile, their proposals will appear here for verification and live merging.'
                  : 'Try clearing your search query or switching to a different status filter.'}
              </p>
            </div>
          ) : (
            filteredSubmissions.map((sub) => {
              const liveEntity = entities.find(e => e.id === sub.entityId);
              return (
                <div 
                  key={sub.id}
                  className="bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-lg p-5 shadow-2xs transition-all space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F3F4F6] pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-editorial text-base font-bold text-[#111827]">
                          {sub.entityName}
                        </span>
                        {sub.isNewEntity && (
                          <span className="px-2 py-0.5 text-[10px] font-technical uppercase font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] rounded">
                            🌱 New Entity
                          </span>
                        )}
                        {liveEntity ? (
                          <span className="px-2 py-0.5 text-[10px] font-technical uppercase bg-[#F3F4F6] text-[#4B5563] rounded">
                            {liveEntity.type} • {liveEntity.category}
                          </span>
                        ) : sub.proposedEntity ? (
                          <span className="px-2 py-0.5 text-[10px] font-technical uppercase bg-[#F3F4F6] text-[#4B5563] rounded">
                            {sub.proposedEntity.type} • {sub.proposedEntity.category}
                          </span>
                        ) : null}
                        <span className={`px-2 py-0.5 text-[10px] font-technical uppercase font-bold rounded ${
                          sub.status === 'pending'
                            ? 'bg-[#FEF08A] text-[#854D0E] border border-[#FDE047]'
                            : sub.status === 'approved'
                            ? 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                            : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                        }`}>
                          {sub.status === 'pending' ? 'Pending Review' : sub.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-[#6B7280] mt-1 font-sans flex-wrap gap-y-1">
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3.5 h-3.5 text-[#8C877F]" />
                          <span className="font-medium text-[#111827]">{sub.submitterEmail}</span>
                        </span>
                        {sub.submitterRelationship && (
                          <span className="flex items-center space-x-1 px-1.5 py-0.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded text-[11px] text-[#374151] font-technical">
                            <span className="text-xs">🤝</span>
                            <span className="font-medium">{sub.submitterRelationship}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-[#8C877F]" />
                          <span>{new Date(sub.submittedAt).toLocaleString()}</span>
                        </span>
                      </div>
                    </div>

                    {/* Quick Entity Action */}
                    {liveEntity && onSelectEntity && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectEntity(liveEntity);
                          onClose();
                        }}
                        className="self-start sm:self-auto flex items-center space-x-1 text-xs text-[#5B21B6] hover:underline font-technical"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect in map</span>
                      </button>
                    )}
                  </div>

                  {/* Proposed Changes Diff View */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-technical uppercase tracking-wider text-[#6B7280] font-semibold block">
                      Proposed Changes ({sub.diffs.length} field{sub.diffs.length === 1 ? '' : 's'})
                    </span>

                    {sub.diffs.length === 0 ? (
                      <p className="text-xs text-[#9CA3AF] italic">
                        No distinct field modifications detected from original values.
                      </p>
                    ) : (
                      <div className="border border-[#E5E7EB] rounded-md overflow-hidden divide-y divide-[#E5E7EB]">
                        {sub.diffs.map((diff, dIdx) => (
                          <div key={dIdx} className="grid grid-cols-1 md:grid-cols-12 text-xs">
                            <div className="md:col-span-3 p-2.5 bg-[#FAF8F5] font-technical font-medium text-[#374151] border-b md:border-b-0 md:border-r border-[#E5E7EB]">
                              {diff.label}
                            </div>
                            <div className="md:col-span-4 p-2.5 bg-rose-50/50 text-[#991B1B] border-b md:border-b-0 md:border-r border-[#E5E7EB]">
                              <div className="text-[10px] uppercase font-technical text-rose-700/70 font-semibold mb-1">
                                Current Live Value
                              </div>
                              {renderValuePreview(diff.oldValue)}
                            </div>
                            <div className="md:col-span-5 p-2.5 bg-emerald-50/50 text-[#065F46]">
                              <div className="text-[10px] uppercase font-technical text-emerald-700/70 font-semibold mb-1 flex items-center justify-between">
                                <span>Proposed Value</span>
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded">New</span>
                              </div>
                              {renderValuePreview(diff.newValue)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submission Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#F3F4F6]">
                    <div className="text-[11px] text-[#9CA3AF] font-technical">
                      ID: {sub.id}
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleDelete(sub.id)}
                        title="Delete this submission record"
                        className="p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {sub.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleReject(sub.id, sub.entityName)}
                          className="px-3 py-1.5 bg-white border border-[#E5E7EB] hover:border-[#DC2626] text-[#4B5563] hover:text-[#DC2626] rounded text-xs font-technical transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                      )}

                      {sub.status !== 'approved' ? (
                        <button
                          type="button"
                          onClick={() => handleApprove(sub)}
                          className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white rounded text-xs font-technical font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-[#D9C01B]" />
                          <span>Approve & Apply to Map</span>
                        </button>
                      ) : (
                        <span className="flex items-center space-x-1 text-xs text-[#059669] font-technical font-medium">
                          <Check className="w-4 h-4" />
                          <span>Applied to Map</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#FAF8F5] flex items-center justify-between text-xs text-[#6B7280]">
          <span>
            {filteredSubmissions.length} contribution{filteredSubmissions.length === 1 ? '' : 's'} shown
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#111827] rounded text-xs font-technical transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
