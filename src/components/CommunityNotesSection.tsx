import React, { useState, useEffect } from 'react';
import { Users, Plus, X, MessageSquare, Check, Trash2 } from 'lucide-react';
import { EcosystemEntity, CommunityNote, EntityType } from '../types';

interface CommunityNotesSectionProps {
  entity: EcosystemEntity;
  editMode?: boolean;
  onAddNote: (entityId: string, author: string, content: string) => void;
  onDeleteNote?: (entityId: string, noteId: string) => void;
  compact?: boolean;
}

export const CommunityNotesSection: React.FC<CommunityNotesSectionProps> = ({
  entity,
  editMode = false,
  onAddNote,
  onDeleteNote,
  compact = false
}) => {
  const [isWriting, setIsWriting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState(() => {
    try {
      return localStorage.getItem('metta_community_author_name') || '';
    } catch {
      return '';
    }
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Reset form state if entity changes
  useEffect(() => {
    setIsWriting(false);
    setCommentText('');
    setErrorMsg(null);
    setConfirmingDeleteId(null);
  }, [entity.id]);

  const getAdaptiveNoun = (type: EntityType): string => {
    switch (type) {
      case 'Organization':
        return 'organization';
      case 'Person':
        return 'person';
      case 'Idea':
        return 'idea';
      default:
        return 'organization, person or idea';
    }
  };

  const adaptiveNoun = getAdaptiveNoun(entity.type);
  const notes = entity.communityNotes || [];

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedComment = commentText.trim();
    const trimmedName = authorName.trim();

    if (!trimmedComment) {
      setErrorMsg('Please enter your note or comment before confirming.');
      return;
    }

    if (!trimmedName) {
      setErrorMsg('Please add your name in order to confirm and leave your comment.');
      return;
    }

    // Save author name for next time in localStorage
    try {
      localStorage.setItem('metta_community_author_name', trimmedName);
    } catch (err) {
      console.warn('Could not save author name', err);
    }

    onAddNote(entity.id, trimmedName, trimmedComment);
    setCommentText('');
    setErrorMsg(null);
    setIsWriting(false);
  };

  const formatTimestamp = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Community Notes</span>
            {notes.length > 0 && (
              <span className="font-technical text-[10px] bg-[#FAF8F5] border border-[#E5E7EB] px-1.5 py-0.2 rounded-[2px] text-[#4B5563] ml-1">
                {notes.length}
              </span>
            )}
          </h3>
          {editMode && notes.length > 0 && (
            <span className="font-technical text-[9px] bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-1.5 py-0.2 rounded-[2px] uppercase font-semibold">
              Delete Enabled
            </span>
          )}
        </div>

        {!isWriting && (
          <button
            type="button"
            onClick={() => {
              setIsWriting(true);
              setErrorMsg(null);
            }}
            className="flex items-center space-x-1 font-technical text-[10px] text-[#0284C7] hover:text-[#0369A1] font-semibold transition-colors cursor-pointer py-0.5 px-1 rounded hover:bg-[#F0F9FF]"
          >
            <Plus className="w-3 h-3" />
            <span>Add Note</span>
          </button>
        )}
      </div>

      {/* Empty State: pre-filled opaque text when no community notes added yet */}
      {notes.length === 0 && !isWriting && (
        <div
          onClick={() => setIsWriting(true)}
          className="bg-[#FAF8F5] p-3 border border-dashed border-[#E5E7EB] hover:border-[#0284C7] rounded-[4px] text-xs font-sans text-[#8C877F] italic leading-relaxed opacity-85 cursor-pointer transition-colors group"
          title="Click to leave a community note"
        >
          <p>
            No community notes added yet. Feel free to add more information or your experience with this {adaptiveNoun}.
          </p>
          <div className="mt-2 flex items-center space-x-1 text-[11px] not-italic font-technical text-[#0284C7] group-hover:underline">
            <Plus className="w-3 h-3" />
            <span>Leave a note</span>
          </div>
        </div>
      )}

      {/* List of Community Notes */}
      {notes.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-3 bg-[#FAF8F5] border rounded-[4px] space-y-1.5 text-xs font-sans text-[#111827] leading-relaxed transition-all ${
                editMode ? 'border-[#E5E7EB] hover:border-[#F87171]/50' : 'border-[#E5E7EB]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 truncate">
                  <div className="w-4 h-4 rounded-full bg-[#0284C7]/15 text-[#0284C7] font-technical font-bold text-[9px] flex items-center justify-center shrink-0">
                    {note.author ? note.author.charAt(0).toUpperCase() : '?'}
                  </div>
                  <span className="font-semibold text-xs text-[#111827] truncate">
                    {note.author}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="font-technical text-[10px] text-[#8C877F]">
                    {formatTimestamp(note.createdAt)}
                  </span>
                  {editMode && onDeleteNote && (
                    <div>
                      {confirmingDeleteId === note.id ? (
                        <div className="flex items-center space-x-1 bg-[#FEF2F2] border border-[#FECACA] px-1.5 py-0.5 rounded-[3px] shadow-2xs animate-in fade-in duration-150">
                          <span className="font-technical text-[9.5px] text-[#DC2626] font-semibold">Delete?</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteNote(entity.id, note.id);
                              setConfirmingDeleteId(null);
                            }}
                            className="font-technical text-[9.5px] font-bold text-[#DC2626] hover:underline px-1 py-0.2 cursor-pointer"
                            title="Confirm deletion"
                          >
                            Yes
                          </button>
                          <span className="text-[#D1D5DB] text-[9px]">|</span>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            className="font-technical text-[9.5px] text-[#6B7280] hover:text-[#111827] px-1 py-0.2 cursor-pointer"
                            title="Cancel deletion"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(note.id)}
                          className="text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] p-1 rounded transition-colors cursor-pointer"
                          title="Delete note (Edit Mode)"
                          aria-label={`Delete note by ${note.author}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <p className="font-sans text-xs text-[#374151] leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Comment Form: To leave a comment, user adds their comment and their name to a field and confirms */}
      {isWriting && (
        <form
          onSubmit={handleConfirm}
          className="p-3 bg-[#FAF8F5] border border-[#111827]/30 rounded-[4px] space-y-2.5 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-1.5">
            <span className="font-editorial font-semibold text-xs text-[#111827]">
              Leave a Community Note
            </span>
            <button
              type="button"
              onClick={() => {
                setIsWriting(false);
                setErrorMsg(null);
              }}
              className="text-[#8C877F] hover:text-[#111827] p-0.5 rounded"
              title="Close composer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <textarea
              autoFocus
              value={commentText}
              onChange={(e) => {
                setCommentText(e.target.value);
                setErrorMsg(null);
              }}
              placeholder={`Add your experience, reflection, or additional info regarding this ${adaptiveNoun}...`}
              className="w-full h-20 bg-white border border-[#E5E7EB] focus:border-[#111827] p-2.5 text-xs font-sans rounded-[4px] outline-none text-[#111827] resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block font-technical text-[10.5px] uppercase font-semibold text-[#4B5563] mb-1">
              Your Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => {
                setAuthorName(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Enter your name to confirm..."
              className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] px-2.5 py-1.5 text-xs font-sans rounded-[4px] outline-none text-[#111827]"
            />
            <span className="font-technical text-[9.5px] text-[#8C877F] block mt-0.5">
              Add your name to leave and close this comment.
            </span>
          </div>

          {errorMsg && (
            <div className="p-2 bg-[#FEF2F2] border border-[#F87171] text-[#B91C1C] text-[11px] font-sans rounded-[3px]">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsWriting(false);
                setErrorMsg(null);
              }}
              className="px-3 py-1.5 text-xs font-sans text-[#4B5563] hover:text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-[3px] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#111827] hover:bg-[#20293A] text-white text-xs font-sans font-medium rounded-[3px] shadow-2xs transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-[#D9C01B]" />
              <span>Confirm & Post Note</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
