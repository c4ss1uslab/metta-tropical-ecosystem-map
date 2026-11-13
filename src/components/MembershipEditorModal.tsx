import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Search, ListTree, Check, Plus, Star, Compass, ChevronDown, Edit3, ArrowRight, AlertCircle
} from 'lucide-react';
import {
  EcosystemEntity, CategoryQuadrant, ArchipelagoMeta, ContinentInfo,
  getEntityCompleteness, getCompletenessConfig
} from '../types';
import {
  formatClusterWithNumber,
  normalizeArchipelagoBaseName,
  getEntityOtherArchipelagos,
  getFieldDisplayName
} from '../utils/layoutGenerator';
import { getEntityMapLayer } from '../utils/layerClassifier';

export interface EntityMembershipChange {
  /** New primary archipelago / field. null clears it, undefined leaves it unchanged. */
  continent?: string | null;
  /** Full list of secondary archipelagos (Layer 1 only). */
  otherArchipelagos?: string[];
  quadrant?: CategoryQuadrant;
}

type GroupLayer = 1 | 2 | 3;

interface MembershipGroup {
  key: string;
  name: string;
  layer: GroupLayer;
  quadrant?: CategoryQuadrant;
  primaryCount: number;
  affiliatedCount: number;
}

interface MembershipEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: EcosystemEntity[];
  archipelagoMetadata: Record<string, ArchipelagoMeta>;
  layerFieldContinents: Record<number, ContinentInfo[]>;
  initialLayer: GroupLayer;
  onUpdateEntityMembership: (entityId: string, changes: EntityMembershipChange) => void;
  onRenameGroup: (oldName: string, newName: string, layer: GroupLayer) => void;
  onUpdateArchipelagoQuadrant?: (archipelagoName: string, quadrant: CategoryQuadrant) => void;
  onLocateEntity?: (entity: EcosystemEntity) => void;
}

const QUADRANTS: CategoryQuadrant[] = ['Inner', 'Social', 'Cultural', 'Systems'];

const QUADRANT_COLORS: Record<CategoryQuadrant, string> = {
  Inner: '#5B21B6',
  Social: '#111827',
  Cultural: '#7D8764',
  Systems: '#0284C7'
};

const PAGE_SIZE = 60;

const groupKey = (name: string) => normalizeArchipelagoBaseName(name) || name.toLowerCase().trim();

const splitNumber = (name: string): { num: string; label: string } => {
  const m = String(name || '').trim().match(/^(\d+)[\.\)]\s*(.*)$/);
  return m ? { num: m[1], label: m[2] } : { num: '', label: String(name || '').trim() };
};

const typeIcon = (type: string) => (type === 'Person' ? '🧙' : type === 'Idea' ? '🔮' : type === 'Media' ? '🎙️' : '🕸️');

const groupTerm = (layer: GroupLayer) => (layer === 1 ? 'Archipelago' : 'Field');

const groupDisplayName = (group: Pick<MembershipGroup, 'name' | 'layer' | 'quadrant'>) =>
  group.layer === 1 ? group.name : getFieldDisplayName(group.name, group.quadrant);

function majorityQuadrant(votes: Partial<Record<CategoryQuadrant, number>>): CategoryQuadrant | undefined {
  let best: CategoryQuadrant | undefined;
  let bestCount = 0;
  QUADRANTS.forEach(q => {
    const c = votes[q] || 0;
    if (c > bestCount) {
      best = q;
      bestCount = c;
    }
  });
  return best;
}

// ---------------------------------------------------------------------------
// Searchable picker of existing archipelagos / fields (with "create new")
// ---------------------------------------------------------------------------
interface GroupPickerProps {
  groups: MembershipGroup[];
  excludeKeys?: string[];
  placeholder: string;
  allowNone?: boolean;
  onPick: (name: string | null, group?: MembershipGroup) => void;
  layer: GroupLayer;
}

const GroupPicker: React.FC<GroupPickerProps> = ({ groups, excludeKeys = [], placeholder, allowNone, onPick, layer }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const q = query.trim().toLowerCase();
  const options = groups
    .filter(g => !excludeKeys.includes(g.key))
    .filter(g => !q || g.name.toLowerCase().includes(q) || groupDisplayName(g).toLowerCase().includes(q));
  const exact = q && groups.some(g => g.key === groupKey(query) || g.name.toLowerCase() === q);

  const pick = (name: string | null, group?: MembershipGroup) => {
    onPick(name, group);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter') {
              if (options.length === 1) pick(options[0].name, options[0]);
              else if (q && !exact) pick(query.trim());
            }
          }}
          className="w-full bg-white border border-[#D1D5DB] focus:border-[#111827] pl-8 pr-7 py-1.5 text-xs font-sans rounded-[4px] outline-none shadow-2xs placeholder-[#9CA3AF]"
        />
        <ChevronDown className="w-3.5 h-3.5 text-[#8C877F] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-[4px] shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-[#F3F4F6]">
          {allowNone && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="w-full text-left px-2.5 py-1.5 text-xs font-sans text-[#6B7280] italic hover:bg-[#FAF8F5] cursor-pointer"
            >
              No {groupTerm(layer).toLowerCase()} (unassigned)
            </button>
          )}
          {q && !exact && (
            <button
              type="button"
              onClick={() => pick(query.trim())}
              className="w-full text-left px-2.5 py-1.5 text-xs font-sans text-[#111827] hover:bg-[#FAF8F5] flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-[#5B21B6]" />
              <span>Create new {groupTerm(layer).toLowerCase()} “<strong>{query.trim()}</strong>”</span>
            </button>
          )}
          {options.length === 0 && !q && (
            <div className="px-2.5 py-3 text-center text-xs text-[#8C877F] font-sans">No other {groupTerm(layer).toLowerCase()}s available.</div>
          )}
          {options.map(g => (
            <button
              key={g.key}
              type="button"
              onClick={() => pick(g.name, g)}
              className="w-full text-left px-2.5 py-1.5 text-xs font-sans hover:bg-[#FAF8F5] flex items-center justify-between gap-2 cursor-pointer"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: g.quadrant ? QUADRANT_COLORS[g.quadrant] : '#D1D5DB' }}
                  title={g.quadrant ? `${g.quadrant} Quadrant` : 'No quadrant'}
                />
                <span className="truncate text-[#111827]">{groupDisplayName(g)}</span>
              </span>
              <span className="font-technical text-[10px] text-[#8C877F] shrink-0">{g.primaryCount}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Archipelago / field row with inline rename & renumber
// ---------------------------------------------------------------------------
interface GroupRowProps {
  group: MembershipGroup;
  allGroups: MembershipGroup[];
  onRename: (oldName: string, newName: string, layer: GroupLayer) => void;
  onUpdateQuadrant?: (name: string, quadrant: CategoryQuadrant) => void;
  onViewEntities: (group: MembershipGroup) => void;
}

const GroupRow: React.FC<GroupRowProps> = ({ group, allGroups, onRename, onUpdateQuadrant, onViewEntities }) => {
  const initial = splitNumber(group.name);
  const [num, setNum] = useState(initial.num);
  const [label, setLabel] = useState(initial.label);

  useEffect(() => {
    const parts = splitNumber(group.name);
    setNum(parts.num);
    setLabel(parts.label);
  }, [group.name]);

  const nextName = (num.trim() ? `${num.trim()}. ` : '') + label.trim();
  const dirty = label.trim() !== '' && nextName !== group.name;
  const collision = dirty
    ? allGroups.find(g => g.key !== group.key && g.key === groupKey(nextName))
    : undefined;

  const save = () => {
    if (!dirty) return;
    if (collision) {
      const ok = window.confirm(
        `"${groupDisplayName(collision)}" already exists. Saving will merge "${groupDisplayName(group)}" into it. Continue?`
      );
      if (!ok) return;
    }
    onRename(group.name, nextName, group.layer);
  };

  const reset = () => {
    setNum(initial.num);
    setLabel(initial.label);
  };

  return (
    <div className="p-2.5 bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-[4px] shadow-2xs flex flex-wrap items-center gap-2">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: group.quadrant ? QUADRANT_COLORS[group.quadrant] : '#D1D5DB' }}
        title={group.quadrant ? `${group.quadrant} Quadrant` : 'No quadrant'}
      />
      <input
        type="text"
        inputMode="numeric"
        value={num}
        onChange={(e) => setNum(e.target.value.replace(/[^\d]/g, ''))}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') reset(); }}
        placeholder="#"
        title={`${groupTerm(group.layer)} number`}
        className="w-12 bg-[#FAF8F5] border border-[#E5E7EB] focus:border-[#111827] px-1.5 py-1 text-xs font-technical text-center rounded-[3px] outline-none"
      />
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') reset(); }}
        title={`${groupTerm(group.layer)} name`}
        className="flex-1 min-w-[160px] bg-white border border-[#E5E7EB] focus:border-[#111827] px-2 py-1 text-xs font-sans font-semibold text-[#111827] rounded-[3px] outline-none"
      />

      {group.layer === 1 && onUpdateQuadrant ? (
        <select
          value={group.quadrant || ''}
          onChange={(e) => onUpdateQuadrant(group.name, e.target.value as CategoryQuadrant)}
          title="Change this archipelago's quadrant (moves all its entities to that quadrant)"
          className="text-[11px] font-technical bg-white border border-[#E5E7EB] rounded-[3px] px-1.5 py-1 cursor-pointer outline-none focus:border-[#111827]"
        >
          {!group.quadrant && <option value="">Quadrant…</option>}
          {QUADRANTS.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
      ) : (
        <span className="text-[10px] font-technical uppercase text-[#6B7280] px-1.5 py-1 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[3px]">
          {group.quadrant || '—'}
        </span>
      )}

      <button
        type="button"
        onClick={() => onViewEntities(group)}
        className="text-[10.5px] font-technical text-[#4B5563] hover:text-[#111827] px-1.5 py-1 rounded-[3px] hover:bg-[#FAF8F5] flex items-center gap-1 cursor-pointer"
        title={`Show the entities of this ${groupTerm(group.layer).toLowerCase()}`}
      >
        <span>{group.primaryCount}</span>
        {group.affiliatedCount > 0 && <span className="text-amber-700">+{group.affiliatedCount}★</span>}
        <ArrowRight className="w-3 h-3" />
      </button>

      {dirty && (
        <div className="flex items-center gap-1 w-full sm:w-auto sm:ml-auto">
          {collision && (
            <span className="text-[10px] text-amber-700 font-sans flex items-center gap-1" title="A group with this name already exists">
              <AlertCircle className="w-3 h-3" /> merges
            </span>
          )}
          <button
            type="button"
            onClick={save}
            className="px-2 py-1 bg-[#111827] hover:bg-[#374151] text-white text-[11px] font-sans font-medium rounded-[3px] flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3 h-3" /> Save
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-2 py-1 bg-white border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] text-[11px] font-sans rounded-[3px] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
export const MembershipEditorModal: React.FC<MembershipEditorModalProps> = ({
  isOpen,
  onClose,
  entities,
  archipelagoMetadata,
  layerFieldContinents,
  initialLayer,
  onUpdateEntityMembership,
  onRenameGroup,
  onUpdateArchipelagoQuadrant,
  onLocateEntity
}) => {
  const [tab, setTab] = useState<'entities' | 'groups'>('entities');
  const [search, setSearch] = useState('');
  const [layerFilter, setLayerFilter] = useState<'all' | GroupLayer>('all');
  const [quadrantFilter, setQuadrantFilter] = useState<'all' | CategoryQuadrant>('all');
  const [groupFilter, setGroupFilter] = useState<MembershipGroup | null>(null);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupsLayer, setGroupsLayer] = useState<GroupLayer>(initialLayer);
  const [groupSearch, setGroupSearch] = useState('');

  useEffect(() => {
    if (isOpen) setGroupsLayer(initialLayer);
  }, [isOpen, initialLayer]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, layerFilter, quadrantFilter, groupFilter, onlyUnassigned]);

  const entityLayers = useMemo(() => {
    const map = new Map<string, GroupLayer>();
    if (!isOpen) return map;
    entities.forEach(e => map.set(e.id, getEntityMapLayer(e) as GroupLayer));
    return map;
  }, [entities, isOpen]);

  const otherArchipelagosById = useMemo(() => {
    const map = new Map<string, string[]>();
    entities.forEach(e => {
      if (entityLayers.get(e.id) === 1) map.set(e.id, getEntityOtherArchipelagos(e));
    });
    return map;
  }, [entities, entityLayers]);

  // Existing archipelagos (Layer 1) and fields (Layers 2 & 3) with counts and quadrants
  const groupsByLayer = useMemo(() => {
    const result: Record<GroupLayer, MembershipGroup[]> = { 1: [], 2: [], 3: [] };
    ([1, 2, 3] as GroupLayer[]).forEach(layer => {
      const map = new Map<string, MembershipGroup & { votes: Partial<Record<CategoryQuadrant, number>> }>();
      const ensure = (rawName: string) => {
        const name = layer === 1 ? formatClusterWithNumber(rawName) : rawName.trim();
        const key = groupKey(name);
        if (!key) return undefined;
        let g = map.get(key);
        if (!g) {
          g = { key, name, layer, primaryCount: 0, affiliatedCount: 0, votes: {} };
          map.set(key, g);
        }
        return g;
      };

      if (layer !== 1) {
        (layerFieldContinents[layer] || []).forEach(c => {
          const g = ensure(c.name);
          if (g && c.category) g.votes[c.category] = (g.votes[c.category] || 0) + 0.5;
        });
      }

      entities.forEach(e => {
        if (entityLayers.get(e.id) !== layer) return;
        if (e.continent && e.continent.trim()) {
          const g = ensure(e.continent);
          if (g) {
            g.primaryCount++;
            const q = (e.quadrant || e.category) as CategoryQuadrant;
            if (q) g.votes[q] = (g.votes[q] || 0) + 1;
          }
        }
        if (layer === 1) {
          (otherArchipelagosById.get(e.id) || []).forEach(o => {
            const g = ensure(o);
            if (g) g.affiliatedCount++;
          });
        }
      });

      result[layer] = Array.from(map.values())
        .map(({ votes, ...g }) => {
          let quadrant = majorityQuadrant(votes);
          if (layer === 1) {
            const meta = archipelagoMetadata[g.name]
              || Object.entries(archipelagoMetadata).find(([k]) => k !== '__global__' && groupKey(k) === g.key)?.[1];
            if (meta?.quadrant) quadrant = meta.quadrant;
          }
          return { ...g, quadrant };
        })
        .sort((a, b) => {
          const na = parseInt(splitNumber(a.name).num, 10);
          const nb = parseInt(splitNumber(b.name).num, 10);
          if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
          if (!isNaN(na) && isNaN(nb)) return -1;
          if (isNaN(na) && !isNaN(nb)) return 1;
          return groupDisplayName(a).localeCompare(groupDisplayName(b));
        });
    });
    return result;
  }, [entities, entityLayers, otherArchipelagosById, layerFieldContinents, archipelagoMetadata]);

  const groupLookup = useMemo(() => {
    const map: Record<GroupLayer, Map<string, MembershipGroup>> = { 1: new Map(), 2: new Map(), 3: new Map() };
    ([1, 2, 3] as GroupLayer[]).forEach(l => groupsByLayer[l].forEach(g => map[l].set(g.key, g)));
    return map;
  }, [groupsByLayer]);

  const filteredEntities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entities
      .filter(e => {
        const layer = entityLayers.get(e.id) || 1;
        if (layerFilter !== 'all' && layer !== layerFilter) return false;
        const quad = (e.quadrant || e.category) as CategoryQuadrant;
        if (quadrantFilter !== 'all' && quad !== quadrantFilter) return false;
        if (onlyUnassigned && e.continent && e.continent.trim()) return false;
        if (groupFilter) {
          if (layer !== groupFilter.layer) return false;
          const primaryMatch = e.continent ? groupKey(e.continent) === groupFilter.key : false;
          const otherMatch = layer === 1 && (otherArchipelagosById.get(e.id) || []).some(o => groupKey(o) === groupFilter.key);
          if (!primaryMatch && !otherMatch) return false;
        }
        if (!q) return true;
        const haystack = [
          e.name,
          e.continent || '',
          ...(otherArchipelagosById.get(e.id) || []),
          e.location || '',
          e.type,
          quad
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entities, entityLayers, otherArchipelagosById, search, layerFilter, quadrantFilter, onlyUnassigned, groupFilter]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    return groupsByLayer[groupsLayer].filter(g =>
      !q || g.name.toLowerCase().includes(q) || groupDisplayName(g).toLowerCase().includes(q)
    );
  }, [groupsByLayer, groupsLayer, groupSearch]);

  if (!isOpen) return null;

  const chip = (active: boolean) =>
    `px-2 py-1 text-[10.5px] font-technical uppercase rounded-[3px] border transition-colors cursor-pointer whitespace-nowrap ${
      active
        ? 'bg-[#111827] text-white border-[#111827]'
        : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#111827] hover:text-[#111827]'
    }`;

  const renderEntityRow = (ent: EcosystemEntity) => {
    const layer = entityLayers.get(ent.id) || 1;
    const quad = (ent.quadrant || ent.category) as CategoryQuadrant;
    const others = layer === 1 ? (otherArchipelagosById.get(ent.id) || []) : [];
    const groups = groupsByLayer[layer];
    const primaryGroup = ent.continent ? groupLookup[layer].get(groupKey(layer === 1 ? formatClusterWithNumber(ent.continent) : ent.continent)) : undefined;
    const primaryLabel = ent.continent
      ? (layer === 1 ? formatClusterWithNumber(ent.continent) : getFieldDisplayName(ent.continent, quad))
      : null;
    const isEditing = editingId === ent.id;
    const dcConfig = getCompletenessConfig(getEntityCompleteness(ent));
    const quadMismatch = primaryGroup?.quadrant && primaryGroup.quadrant !== quad;

    return (
      <div
        key={ent.id}
        className={`p-3 bg-white border rounded-[4px] shadow-xs transition-all ${isEditing ? 'border-[#111827]' : 'border-[#E5E7EB] hover:border-[#9CA3AF]'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => setEditingId(isEditing ? null : ent.id)}
            className="flex items-center space-x-2 min-w-0 text-left cursor-pointer group"
          >
            <span className="text-sm shrink-0 select-none">{typeIcon(ent.type)}</span>
            <h4 className="font-editorial text-sm font-bold text-[#111827] truncate group-hover:text-[#5B21B6] transition-colors">
              {ent.name}
            </h4>
          </button>
          <div className="flex items-center space-x-1.5 shrink-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: dcConfig.dotBg, border: `1.5px solid ${dcConfig.dotBorder}` }}
              title={`Data Completeness: ${dcConfig.level}`}
            />
            <span className="text-[9px] font-technical uppercase px-1.5 py-0.5 bg-[#FAF8F5] border border-[#E5E7EB] text-[#8C877F] rounded-[2px]">
              Layer {layer}
            </span>
            <span className="text-[9px] font-technical uppercase px-1.5 py-0.5 bg-[#FAF8F5] border border-[#E5E7EB] text-[#8C877F] rounded-[2px] hidden sm:inline">
              {ent.type}
            </span>
          </div>
        </div>

        {/* Current membership summary */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span
            className="px-1.5 py-0.5 text-[10px] font-technical uppercase font-semibold text-white rounded-[2px]"
            style={{ backgroundColor: QUADRANT_COLORS[quad] || '#6B7280' }}
          >
            {quad}
          </span>
          {primaryLabel ? (
            <span className="px-1.5 py-0.5 text-[10.5px] font-sans font-semibold bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827] rounded-[2px]">
              {primaryLabel}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 text-[10.5px] font-sans italic bg-rose-50 border border-rose-200 text-rose-700 rounded-[2px]">
              No {groupTerm(layer).toLowerCase()}
            </span>
          )}
          {others.map(o => (
            <span
              key={o}
              className="px-1.5 py-0.5 text-[10px] font-sans bg-amber-50 border border-amber-200 text-amber-800 rounded-[2px]"
              title="Other archipelago (affiliated)"
            >
              ★ {o}
            </span>
          ))}
        </div>

        {/* Inline editor */}
        {isEditing && (
          <div className="mt-3 pt-3 border-t border-[#F3F4F6] space-y-3">
            <div>
              <div className="font-technical text-[10px] uppercase tracking-wider text-[#8C877F] mb-1.5">Quadrant</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {QUADRANTS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => q !== quad && onUpdateEntityMembership(ent.id, { quadrant: q })}
                    className={`px-2 py-1.5 text-[11px] font-sans font-semibold rounded-[3px] border transition-colors cursor-pointer ${
                      q === quad ? 'text-white' : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#111827]'
                    }`}
                    style={q === quad ? { backgroundColor: QUADRANT_COLORS[q], borderColor: QUADRANT_COLORS[q] } : undefined}
                  >
                    {q}
                  </button>
                ))}
              </div>
              {quadMismatch && (
                <p className="mt-1.5 text-[10.5px] text-amber-700 font-sans flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {primaryLabel} is in the {primaryGroup?.quadrant} quadrant.
                </p>
              )}
            </div>

            <div>
              <div className="font-technical text-[10px] uppercase tracking-wider text-[#8C877F] mb-1.5">
                {layer === 1 ? 'Primary archipelago' : `Layer ${layer} field`}
                {primaryLabel && <span className="normal-case tracking-normal text-[#111827] font-sans font-semibold ml-1.5">· {primaryLabel}</span>}
              </div>
              <GroupPicker
                layer={layer}
                groups={groups}
                excludeKeys={primaryGroup ? [primaryGroup.key] : []}
                allowNone={Boolean(ent.continent)}
                placeholder={`Move to another ${groupTerm(layer).toLowerCase()}…`}
                onPick={(name, group) => {
                  if (name === null) {
                    onUpdateEntityMembership(ent.id, { continent: null });
                    return;
                  }
                  onUpdateEntityMembership(ent.id, {
                    continent: name,
                    quadrant: group?.quadrant || quad,
                    ...(layer === 1 ? { otherArchipelagos: others.filter(o => groupKey(o) !== groupKey(name)) } : {})
                  });
                }}
              />
              <p className="mt-1 text-[10px] text-[#8C877F] font-sans">
                Picking a {groupTerm(layer).toLowerCase()} also sets the entity's quadrant to match it and places it beside its members.
              </p>
            </div>

            {layer === 1 && (
              <div>
                <div className="font-technical text-[10px] uppercase tracking-wider text-[#8C877F] mb-1.5">Other archipelagos</div>
                {others.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {others.map(o => (
                      <span key={o} className="inline-flex items-center gap-1 pl-1.5 pr-0.5 py-0.5 text-[10.5px] font-sans bg-amber-50 border border-amber-200 text-amber-800 rounded-[2px]">
                        <span>{o}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const group = groupLookup[1].get(groupKey(o));
                            onUpdateEntityMembership(ent.id, {
                              continent: o,
                              quadrant: group?.quadrant || quad,
                              otherArchipelagos: [ent.continent || '', ...others.filter(x => x !== o)].filter(Boolean)
                            });
                          }}
                          title={`Make "${o}" the primary archipelago`}
                          className="p-0.5 hover:bg-amber-100 rounded-[2px] cursor-pointer"
                        >
                          <Star className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateEntityMembership(ent.id, { otherArchipelagos: others.filter(x => x !== o) })}
                          title={`Remove "${o}"`}
                          className="p-0.5 hover:bg-rose-100 hover:text-rose-700 rounded-[2px] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <GroupPicker
                  layer={1}
                  groups={groups}
                  excludeKeys={[...(primaryGroup ? [primaryGroup.key] : []), ...others.map(groupKey)]}
                  placeholder="Add another archipelago…"
                  onPick={(name) => {
                    if (!name) return;
                    onUpdateEntityMembership(ent.id, { otherArchipelagos: [...others, name] });
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#F3F4F6] text-[10px] font-sans">
          <span className="text-[#8C877F] truncate pr-2">{ent.location || ''}</span>
          <div className="flex items-center space-x-1.5 shrink-0">
            {onLocateEntity && (
              <button
                type="button"
                onClick={() => onLocateEntity(ent)}
                title={`Locate ${ent.name} on map`}
                className="p-1 text-[#8C877F] hover:text-[#111827] hover:bg-[#FAF8F5] rounded-[2px] transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditingId(isEditing ? null : ent.id)}
              className={`px-2 py-0.5 text-[10px] font-technical font-medium rounded-[2px] border transition-colors flex items-center gap-1 cursor-pointer ${
                isEditing
                  ? 'bg-[#111827] text-white border-[#111827]'
                  : 'bg-white text-[#111827] border-[#E5E7EB] hover:border-[#111827]'
              }`}
            >
              {isEditing ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              <span>{isEditing ? 'Done' : 'Edit'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#FAF8F5] border border-[#E5E7EB] rounded-lg shadow-2xl flex flex-col h-[90dvh] overflow-hidden text-[#111827]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#E5E7EB] bg-[#FAF8F5]">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-[#5B21B6]/10 rounded-md text-[#5B21B6] shrink-0">
              <ListTree className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#111827]">Membership Editor</h2>
              <p className="text-xs text-[#6B7280] truncate">
                Quadrants, archipelagos & fields of every entity · changes save locally and export with the data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-white rounded-md transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E5E7EB] bg-white px-4 sm:px-6">
          {([
            ['entities', `Entities (${entities.length})`],
            ['groups', 'Archipelagos & Fields']
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-2.5 text-xs font-technical uppercase tracking-wider border-b-2 -mb-px transition-colors cursor-pointer ${
                tab === id ? 'border-[#111827] text-[#111827] font-bold' : 'border-transparent text-[#8C877F] hover:text-[#111827]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'entities' ? (
          <>
            <div className="px-4 sm:px-6 py-3 space-y-2 border-b border-[#E5E7EB] bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter entities by name, archipelago, field, location…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] pl-8 pr-3 py-1.5 text-xs font-sans rounded-[4px] outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" className={chip(layerFilter === 'all')} onClick={() => setLayerFilter('all')}>All layers</button>
                <button type="button" className={chip(layerFilter === 1)} onClick={() => setLayerFilter(1)}>L1 Archipelagos</button>
                <button type="button" className={chip(layerFilter === 2)} onClick={() => setLayerFilter(2)}>L2 Fields</button>
                <button type="button" className={chip(layerFilter === 3)} onClick={() => setLayerFilter(3)}>L3 Fields</button>
                <span className="w-px h-4 bg-[#E5E7EB] mx-0.5" />
                <button type="button" className={chip(quadrantFilter === 'all')} onClick={() => setQuadrantFilter('all')}>All quadrants</button>
                {QUADRANTS.map(q => (
                  <button key={q} type="button" className={chip(quadrantFilter === q)} onClick={() => setQuadrantFilter(q)}>{q}</button>
                ))}
                <span className="w-px h-4 bg-[#E5E7EB] mx-0.5" />
                <button type="button" className={chip(onlyUnassigned)} onClick={() => setOnlyUnassigned(v => !v)}>Unassigned</button>
              </div>
              {groupFilter && (
                <div className="flex items-center gap-1.5 text-[11px] font-sans">
                  <span className="text-[#8C877F]">Showing members of</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#111827] text-white rounded-[3px]">
                    {groupDisplayName(groupFilter)}
                    <button type="button" onClick={() => setGroupFilter(null)} className="hover:text-[#FCA5A5] cursor-pointer" title="Clear">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-2.5">
              <div className="font-technical text-[11px] text-[#8C877F] uppercase tracking-wider px-0.5">
                {filteredEntities.length} {filteredEntities.length === 1 ? 'entity' : 'entities'}
              </div>
              {filteredEntities.length === 0 ? (
                <div className="p-8 text-center bg-white border border-dashed border-[#E5E7EB] rounded-[4px] text-xs text-[#8C877F] font-sans">
                  No entities match these filters.
                </div>
              ) : (
                <>
                  {filteredEntities.slice(0, visibleCount).map(renderEntityRow)}
                  {visibleCount < filteredEntities.length && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                      className="w-full py-2 bg-white border border-[#E5E7EB] hover:border-[#111827] text-xs font-sans text-[#111827] rounded-[4px] cursor-pointer"
                    >
                      Show more ({filteredEntities.length - visibleCount} remaining)
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="px-4 sm:px-6 py-3 space-y-2 border-b border-[#E5E7EB] bg-white">
              <div className="flex flex-wrap items-center gap-1.5">
                {([1, 2, 3] as GroupLayer[]).map(l => (
                  <button key={l} type="button" className={chip(groupsLayer === l)} onClick={() => setGroupsLayer(l)}>
                    {l === 1 ? 'Layer 1 · Archipelagos' : `Layer ${l} · Fields`} ({groupsByLayer[l].length})
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder={`Filter ${groupsLayer === 1 ? 'archipelagos' : 'fields'}…`}
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] pl-8 pr-3 py-1.5 text-xs font-sans rounded-[4px] outline-none"
                />
              </div>
              <p className="text-[10.5px] text-[#8C877F] font-sans">
                Edit the number and name, then press Enter or Save. Every entity, label, shape and export using it is updated.
                {groupsLayer === 1 ? ' Changing the quadrant moves all its entities to that quadrant.' : ' Field quadrants follow their entities.'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-2">
              {filteredGroups.length === 0 ? (
                <div className="p-8 text-center bg-white border border-dashed border-[#E5E7EB] rounded-[4px] text-xs text-[#8C877F] font-sans">
                  {groupsByLayer[groupsLayer].length === 0
                    ? `No ${groupsLayer === 1 ? 'archipelagos' : 'fields'} in this layer yet.`
                    : 'Nothing matches this filter.'}
                </div>
              ) : (
                filteredGroups.map(g => (
                  <GroupRow
                    key={`${g.layer}-${g.key}`}
                    group={g}
                    allGroups={groupsByLayer[groupsLayer]}
                    onRename={onRenameGroup}
                    onUpdateQuadrant={onUpdateArchipelagoQuadrant}
                    onViewEntities={(group) => {
                      setGroupFilter(group);
                      setLayerFilter('all');
                      setQuadrantFilter('all');
                      setOnlyUnassigned(false);
                      setSearch('');
                      setTab('entities');
                    }}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
