import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, ExternalLink, MapPin, Globe, Tag, 
  Map, Edit3, Compass, RotateCcw, RotateCw, MessageSquare, Plus,
  Wand2, Search, ArrowLeft, Building2, User, Sparkles, Navigation, Mountain, Layers, CheckSquare, Square,
  Maximize2, Minimize2, Bookmark, Move,
  Twitter, Linkedin, Instagram, Youtube, Facebook, Github, Network, EyeOff,
  ChevronDown, ChevronUp, ChevronRight, AlertCircle, Activity,
  Check, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EcosystemEntity, CategoryQuadrant, EntityType, ContinentInfo, SidebarListScope, DataQualityStatus, DataCompletenessLevel, DATA_COMPLETENESS_LEVELS, DATA_COMPLETENESS_CONFIG, getEntityCompleteness, getCompletenessConfig, ConnectedInstitutionNode, LayerQuadrantSizes, LayerQuadrantConfig, DEFAULT_LAYER_QUADRANT_SIZES, getQuadrantSizesForLayer } from '../types';
import { suggestContinent, getEntityIntersectionZone, isEntityEcotone, formatClusterWithNumber, getEntityOtherArchipelagos, entityMatchesArchipelago, filterProfileTags, isEntityPrimaryToArchipelago, normalizeArchipelagoBaseName } from '../utils/layoutGenerator';
import { CommunityNotesSection } from './CommunityNotesSection';
import { formatDisplayUrl, cleanWebsiteUrl, extractSocialLinks, parseSocialProfilesField, getSocialPlatformLabel, isTransformationFocusValue, SocialLink } from '../utils/socialMedia';
import { getEntityCategorizedData, getEntityConnectedNodes, parseInstitutionList, OBSOLETE_FABRICATED_FIELDS, parseResourceLinks, ResourceLinkItem, cleanImageUrl, getFaviconFromWebsite, splitRelationshipValues, entityMatchesRelationship, ensureUniqueEntityIds } from '../utils/excelParser';
import { saveContributionSubmission } from '../utils/contributionPipeline';
import { FieldCommentInfo } from './FieldCommentInfo';

const CATEGORY_ICONS: Record<string, string> = {
  'Overview': '📋',
  'Logistic Info': '📦',
  'Relationships': '🤝',
  'Worldview & Change Orientation': '🧭',
  'Warm Data': '🌿',
  'Discourse Analysis / Argument Mapping': '💬',
  'Additional Data': '📎'
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Overview': { bg: '#F3F4F6', text: '#111827', border: '#E5E7EB' },
  'Logistic Info': { bg: '#F0F9FF', text: '#0369A1', border: '#BAE6FD' },
  'Relationships': { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  'Worldview & Change Orientation': { bg: '#F7FEE7', text: '#3F6212', border: '#D9F99D' },
  'Warm Data': { bg: '#FAF5FF', text: '#6B21A8', border: '#E9D5FF' },
  'Discourse Analysis / Argument Mapping': { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  'Additional Data': { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB' }
};

const getSocialIconByPlatform = (platform: string) => {
  switch (platform) {
    case 'twitter': return Twitter;
    case 'linkedin': return Linkedin;
    case 'instagram': return Instagram;
    case 'youtube': return Youtube;
    case 'facebook': return Facebook;
    case 'github': return Github;
    default: return Globe;
  }
};

const getConnectedNodeBadge = (role: ConnectedInstitutionNode['role']) => {
  switch (role) {
    case 'Partner':
      return { label: 'Partner', color: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]', icon: '🤝' };
    case 'Funder / Supporter':
      return { label: 'Funder', color: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]', icon: '🏛️' };
    case 'Founder / Main Source':
      return { label: 'Founder', color: 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]', icon: '🌱' };
    case 'Teacher / Influence':
      return { label: 'Teacher', color: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]', icon: '🎓' };
    case 'Partner / Collaborator':
      return { label: 'Collaborator', color: 'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]', icon: '👥' };
    default:
      return { label: role, color: 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]', icon: '🔗' };
  }
};

interface SearchableTagInputProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  items: string[];
  availableSuggestions: string[];
  isEditable: boolean;
  onAddItem: (item: string) => void;
  onRemoveItem: (item: string) => void;
  onSelectTag?: (item: string) => void;
  badgeStyle: {
    bg: string;
    border: string;
    text: string;
    hoverBorder: string;
    hoverBg: string;
  };
  placeholder?: string;
}

const SearchableTagInput: React.FC<SearchableTagInputProps> = ({
  label,
  count,
  icon,
  items,
  availableSuggestions,
  isEditable,
  onAddItem,
  onRemoveItem,
  onSelectTag,
  badgeStyle,
  placeholder = 'Add new...'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const qLower = inputValue.trim().toLowerCase();
    return availableSuggestions
      .filter(s => s.toLowerCase().includes(qLower) && !items.some(it => it.toLowerCase() === s.toLowerCase()))
      .slice(0, 8);
  }, [inputValue, availableSuggestions, items]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCommitAdd = (val?: string) => {
    const toAdd = (val ?? inputValue).trim();
    if (!toAdd) return;
    onAddItem(toAdd);
    setInputValue('');
    setShowSuggestions(false);
  };

  return (
    <div>
      <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
        {icon}
        <span>{label} ({count})</span>
      </h3>

      <div className="flex flex-wrap gap-2 mb-2">
        {items.length === 0 ? (
          <span className="text-xs font-sans text-[#8C877F] italic">No {label.toLowerCase()} listed.</span>
        ) : (
          items.map(item => (
            <span
              key={item}
              onClick={() => {
                const selection = window.getSelection();
                if (selection && selection.toString().trim().length > 0) return;
                if (!isEditable && onSelectTag) {
                  onSelectTag(item);
                }
              }}
              className={`px-3 py-1 ${badgeStyle.bg} border ${badgeStyle.border} ${badgeStyle.text} font-sans text-xs rounded-[4px] shadow-2xs flex items-center space-x-1.5 transition-all select-text ${
                !isEditable && onSelectTag ? `${badgeStyle.hoverBorder} ${badgeStyle.hoverBg} cursor-pointer` : ''
              }`}
            >
              <span className="select-text">{item}</span>
              {isEditable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item);
                  }}
                  title={`Remove ${item}`}
                  className="p-0.5 text-[#8C877F] hover:text-[#AD2831] hover:bg-black/5 rounded-[2px] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {isEditable && (
        <div ref={containerRef} className="relative mt-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (inputValue.trim()) setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCommitAdd();
                }
                if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              className="flex-1 bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans px-3 py-1.5 rounded-[4px] outline-none"
            />
            <button
              type="button"
              onClick={() => handleCommitAdd()}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#111827] text-white text-xs font-sans rounded-[4px] hover:bg-[#20293a] cursor-pointer shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          {/* Autocomplete suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-[4px] shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-[#F3F4F6]">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleCommitAdd(suggestion)}
                  className="w-full text-left px-3 py-1.5 text-xs font-sans hover:bg-[#FAF8F5] text-[#111827] flex items-center justify-between group cursor-pointer"
                >
                  <span className="font-medium group-hover:text-[#5B21B6]">{suggestion}</span>
                  <span className="text-[10px] font-technical text-[#8C877F] uppercase group-hover:text-[#5B21B6]">Add +</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Renders resource and database links as interactive, clickable elements.
 * Handles markdown links [Label](url), standalone URLs, and plain text.
 */
export const ClickableResourceLinks: React.FC<{
  value: any;
  fieldName?: string;
  className?: string;
}> = ({ value, fieldName, className = '' }) => {
  const links = useMemo(() => parseResourceLinks(value), [value]);

  if (!links || links.length === 0) {
    return <span className="font-sans text-xs text-[#9CA3AF] italic">None listed</span>;
  }

  // If there's only 1 item and no URL, render clean text
  if (links.length === 1 && !links[0].url) {
    return (
      <span className={`font-sans text-xs font-medium text-[#111827] leading-relaxed break-words ${className}`}>
        {links[0].text}
      </span>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 pt-0.5 ${className}`}>
      {links.map((link, idx) => {
        if (link.url) {
          return (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-white border border-[#BAE6FD] hover:border-[#0284C7] rounded-[4px] text-xs font-technical text-[#0284C7] hover:text-[#0369A1] transition-all group shadow-2xs cursor-pointer max-w-full"
              title={`${link.text} (${link.url})`}
            >
              <span className="truncate font-semibold underline decoration-[#BAE6FD] underline-offset-2 group-hover:decoration-[#0284C7]">
                {link.text}
              </span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform text-[#0284C7]" />
            </a>
          );
        }
        return (
          <span
            key={idx}
            className="inline-block px-2 py-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[3px] text-xs font-sans text-[#374151]"
          >
            {link.text}
          </span>
        );
      })}
    </div>
  );
};

interface CategorizedFieldsSectionProps {
  entity: EcosystemEntity;
  editMode: boolean;
  isContributing?: boolean;
  onUpdateEntity: (updated: EcosystemEntity) => void;
  isEnlarged?: boolean;
  allEntities?: EcosystemEntity[];
  onSelectEntity?: (entity: EcosystemEntity) => void;
  onSelectUnmappedNode?: (name: string) => void;
  onlyCategory?: string;
  excludeCategories?: string[];
  excludeFields?: string[];
  hideHeaderTitle?: boolean;
  defaultOpenAll?: boolean;
  onSelectCategory?: (category: CategoryQuadrant) => void;
  onSelectArchipelago?: (archipelago: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectRelationship?: (relationship: string) => void;
}

const CategorizedFieldsSection: React.FC<CategorizedFieldsSectionProps> = ({
  entity,
  editMode,
  isContributing = false,
  onUpdateEntity,
  isEnlarged = false,
  allEntities = [],
  onSelectEntity = (_entity: EcosystemEntity) => {},
  onSelectUnmappedNode = (_name: string) => {},
  onlyCategory,
  excludeCategories = [],
  excludeFields = [],
  hideHeaderTitle = false,
  defaultOpenAll = false,
  onSelectCategory,
  onSelectArchipelago,
  onSelectTag,
  onSelectRelationship
}) => {
  const categorizedData = useMemo(() => getEntityCategorizedData(entity), [entity]);
  
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Overview': true,
    'Logistic Info': true,
    'Relationships': true,
    'Worldview & Change Orientation': true,
    'Warm Data': true,
    'Discourse Analysis / Argument Mapping': true,
    'Additional Data': true
  });

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const getRoleForFieldKey = (fieldKey: string): ConnectedInstitutionNode['role'] => {
    const fLower = fieldKey.toLowerCase();
    if (fLower.includes('founder') || fLower.includes('main source')) {
      return 'Founder / Main Source';
    }
    if (fLower.includes('funder') || fLower.includes('supporter')) {
      return 'Funder / Supporter';
    }
    if (fLower.includes('teacher') || fLower.includes('influence')) {
      return 'Teacher / Influence';
    }
    if (fLower.includes('collaborat')) {
      return 'Partner / Collaborator';
    }
    if (fLower.includes('partner')) {
      return 'Partner';
    }
    return 'Partner';
  };

  const findMatchingEntity = (name: string): EcosystemEntity | undefined => {
    const cleanName = name.toLowerCase().trim();
    if (!cleanName || !allEntities) return undefined;
    return allEntities.find(other => {
      if (other.id === entity.id) return false;
      const otherName = other.name.toLowerCase().trim();
      const otherId = other.id.toLowerCase().trim();
      return (
        otherName === cleanName ||
        otherId === cleanName ||
        (cleanName.length >= 6 && otherName.includes(cleanName)) ||
        (otherName.length >= 6 && cleanName.includes(otherName))
      );
    });
  };

  // Reciprocal connections: other entities in the ecosystem linking to this entity
  const reciprocalNodes = useMemo(() => {
    if (!allEntities || allEntities.length === 0 || !entity) return [];
    const allConnected = getEntityConnectedNodes(entity, allEntities);
    const ownFieldNames = new Set<string>();
    if (categorizedData['Relationships']) {
      Object.values(categorizedData['Relationships']).forEach(v => {
        parseInstitutionList(v).forEach(n => ownFieldNames.add(n.toLowerCase().trim()));
      });
    }
    return allConnected.filter(node => !ownFieldNames.has(node.name.toLowerCase().trim()));
  }, [entity, allEntities, categorizedData]);

  const renderConnectedNodeCard = (
    name: string,
    role: ConnectedInstitutionNode['role'],
    key: string,
    explicitTarget?: EcosystemEntity
  ) => {
    const targetEntity = explicitTarget || findMatchingEntity(name);
    const badge = getConnectedNodeBadge(role);

    if (targetEntity) {
      return (
        <button
          key={key}
          type="button"
          onClick={() => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) return;
            onSelectEntity(targetEntity);
          }}
          className="w-full flex items-center justify-between p-2 bg-white hover:bg-[#FAF8F5] border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-[4px] text-xs font-sans text-left transition-all group cursor-pointer shadow-2xs select-text"
          title={`Inspect ${targetEntity.name} on map`}
        >
          <div className="flex items-center space-x-2 truncate min-w-0 pr-2 select-text">
            <span className="text-xs shrink-0 select-none">
              {targetEntity.type === 'Person' ? '🧙' : targetEntity.type === 'Idea' ? '🔮' : targetEntity.type === 'Media' ? '🎙️' : '🕸️'}
            </span>
            <span className="font-medium text-[#111827] truncate group-hover:text-[#5B21B6] select-text">
              {name}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0 select-none">
            <span className={`font-technical text-[9px] font-semibold px-1.5 py-0.5 rounded-[2px] border ${badge.color}`}>
              {badge.label}
            </span>
            <span className="font-technical text-[9.5px] text-[#8C877F] hidden sm:inline">
              {targetEntity.category}
            </span>
            <span className="text-[#9CA3AF] group-hover:text-[#5B21B6] transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </button>
      );
    }

    return (
      <button
        key={key}
        type="button"
        onClick={() => {
          const selection = window.getSelection();
          if (selection && selection.toString().trim().length > 0) return;
          onSelectUnmappedNode(name);
        }}
        className="w-full flex items-center justify-between p-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-[4px] text-xs font-sans text-left transition-all cursor-pointer group shadow-2xs select-text"
        title={`Click to check ${name}`}
      >
        <div className="flex items-center space-x-2 truncate min-w-0 pr-2 select-text">
          <span className="text-xs shrink-0 select-none">
            {badge.icon}
          </span>
          <span className="font-medium text-[#374151] truncate group-hover:text-[#111827] select-text">
            {name}
          </span>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className={`font-technical text-[9px] font-semibold px-1.5 py-0.5 rounded-[2px] border shrink-0 ${badge.color}`}>
            {badge.label}
          </span>
          <span className="font-technical text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1 py-0.5 rounded-[2px]">
            Unmapped
          </span>
        </div>
      </button>
    );
  };

  const handleUpdateFieldValue = (catName: string, fieldKey: string, newVal: any) => {
    const updatedCategorized = {
      ...(entity.categorizedFields || {}),
      [catName]: {
        ...((entity.categorizedFields && entity.categorizedFields[catName]) || {}),
        [fieldKey]: newVal
      }
    };
    const updatedExtra = {
      ...(entity.extraFields || {}),
      [fieldKey]: newVal
    };

    const updatedEntity: EcosystemEntity = {
      ...entity,
      categorizedFields: updatedCategorized,
      extraFields: updatedExtra
    };

    if (fieldKey === 'Description') updatedEntity.description = newVal;
    if (fieldKey === 'Website URL') updatedEntity.website = newVal;
    if (fieldKey === 'Logo') updatedEntity.logo = newVal;
    if (fieldKey === 'Favicon') updatedEntity.favicon = newVal;
    if (fieldKey === 'Language(s)' || fieldKey === 'Language') updatedEntity.language = newVal;
    if (fieldKey === 'Maturity Level') updatedEntity.stage = newVal;
    if (fieldKey === 'City, State' || fieldKey === 'Location') updatedEntity.location = newVal;
    if (fieldKey === 'Category') updatedEntity.category = newVal;
    if (fieldKey === 'Other Archipelagos' || fieldKey === 'other archipelagos' || fieldKey === 'Island/Cluster' || fieldKey === 'Islands') {
      const parsedArchs = typeof newVal === 'string' ? newVal.split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean) : (Array.isArray(newVal) ? newVal : [newVal]);
      updatedEntity.otherArchipelagos = parsedArchs;
      const nonArchFields = filterProfileTags(updatedEntity.fields || [], updatedEntity);
      updatedEntity.fields = Array.from(new Set([...nonArchFields, ...parsedArchs])).filter(Boolean);
    }
    if (fieldKey === 'Org ID' || fieldKey === 'id') updatedEntity.id = newVal;
    if (fieldKey === 'Our Relationship') updatedEntity.ourRelationship = newVal;
    if (fieldKey === 'Founder(s)/Main Source(s)') {
      const parsed = parseInstitutionList(newVal);
      updatedEntity.founders = parsed.length > 0 ? parsed : undefined;
    }
    if (fieldKey === 'Partners (Institutions)') {
      const parsed = parseInstitutionList(newVal);
      updatedEntity.partners = parsed.length > 0 ? parsed : undefined;
    }
    if (fieldKey === 'Funders/Supporters (Institutions)') {
      const parsed = parseInstitutionList(newVal);
      updatedEntity.funders = parsed.length > 0 ? parsed : undefined;
    }
    if (fieldKey === 'Teachers/Influences (People)') {
      const parsed = parseInstitutionList(newVal);
      updatedEntity.teachers = parsed.length > 0 ? parsed : undefined;
    }
    if (fieldKey === 'Partners/Collaborators (People)') {
      const parsed = parseInstitutionList(newVal);
      updatedEntity.collaborators = parsed.length > 0 ? parsed : undefined;
    }
    if (fieldKey === 'Point of Contact(s)' || fieldKey === 'Point of Contact' || fieldKey === 'POC') {
      updatedEntity.contactName = newVal;
    }
    if (fieldKey === 'Email') {
      updatedEntity.contactEmail = newVal;
    }
    if (fieldKey === 'Analyst Commentary') {
      updatedEntity.notes = newVal;
    }
    if (fieldKey === 'Social Profile(s)') {
      const parsedSocials = parseSocialProfilesField(newVal);
      if (Object.keys(parsedSocials).length > 0) {
        updatedEntity.socialMedia = {
          ...(updatedEntity.socialMedia || {}),
          ...parsedSocials
        };
      }
    }
    if (fieldKey === 'Keywords/Topics') {
      const parsedFields = typeof newVal === 'string' ? newVal.split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean) : (Array.isArray(newVal) ? newVal : [newVal]);
      const otherArchs = getEntityOtherArchipelagos(updatedEntity);
      const combined = Array.from(new Set([...(Array.isArray(parsedFields) ? parsedFields : []), ...otherArchs])).filter(Boolean);
      updatedEntity.fields = combined;
    }
    if (fieldKey === 'Practices') {
      updatedExtra['Practices'] = newVal;
    }
    if (fieldKey === 'Offerings') {
      updatedExtra['Offerings'] = newVal;
    }
    if (fieldKey === 'Who They Serve') {
      updatedExtra['Who They Serve'] = newVal;
    }

    onUpdateEntity(updatedEntity);
  };

  const getDisplayFieldLabel = (key: string): string => {
    const kLower = key.trim().toLowerCase();
    if (
      kLower === 'island/cluster' ||
      kLower === 'island / cluster' ||
      kLower === 'island' ||
      kLower === 'cluster' ||
      kLower === 'islands' ||
      kLower === 'other archipelago' ||
      kLower === 'other archipelagos'
    ) {
      return 'Other Archipelagos';
    }
    return key;
  };

  const renderFieldLabel = (key: string): React.ReactNode => {
    const kLower = key.trim().toLowerCase();
    if (kLower.includes('transformation focus') && (kLower.includes('i-v') || kLower.includes('inner'))) {
      return (
        <span className="flex flex-col leading-snug">
          <span>Transformation Focus (I-V)</span>
          <span className="text-[9px] text-[#6B7280] tracking-normal font-medium mt-0.5 uppercase">
            - Inner, Social, Cultural, Systems
          </span>
        </span>
      );
    }
    return getDisplayFieldLabel(key);
  };

  const isExcludedField = (catName: string, fieldKey: string) => {
    const fLower = fieldKey.trim().toLowerCase();
    // Exclude any obsolete fabricated fields (e.g. "Worldview / Paradigm / Lineage")
    if (OBSOLETE_FABRICATED_FIELDS.some(obs => obs.toLowerCase().trim() === fLower)) {
      return true;
    }
    if (fLower === 'featured?' || fLower === 'featured') {
      return true;
    }
    // User request 4.b: approach, issues, activities shouldn't appear on the right column
    if (
      fLower === 'approach' ||
      fLower.includes('approach') ||
      fLower === 'issues' ||
      fLower === 'issue' ||
      fLower.includes('issue') ||
      fLower === 'activities' ||
      fLower === 'activity' ||
      fLower.includes('activit')
    ) {
      return true;
    }
    if (catName === 'Overview') {
      // User request b: remove name/label, entity type, description, data quality
      // User request a: our relationship moved to below Archipelago
      // User request: other archipelagos moved to below Archipelago
      if (
        fLower === 'name/label' ||
        fLower === 'name' ||
        fLower === 'label' ||
        fLower === 'entity type' ||
        fLower === 'type' ||
        fLower === 'description' ||
        fLower === 'data quality' ||
        fLower === 'dataquality' ||
        fLower === 'our relationship' ||
        fLower === 'relationship' ||
        fLower === 'other archipelagos' ||
        fLower === 'other archipelago' ||
        fLower === 'island/cluster' ||
        fLower === 'islands' ||
        fLower === 'island' ||
        fLower === 'cluster'
      ) {
        return true;
      }
      // User request 4.c: hide Org ID in contribution mode, or if not editMode
      if ((!editMode || isContributing) && (fLower === 'org id' || fLower === 'orgid' || fLower === 'id' || fLower === 'entity id')) {
        return true;
      }
    }

    // User request 4.c: remove the ecotones, "our relationship", "map position", "org ID", "Transformation Focus" and "Orientation to Change" in contribution view
    if (isContributing) {
      if (fLower === 'org id' || fLower === 'orgid' || fLower === 'id' || fLower === 'entity id') {
        return true;
      }
      if (fLower.includes('transformation focus')) {
        return true;
      }
      if (fLower.includes('orientation to change')) {
        return true;
      }
      if (fLower === 'our relationship' || fLower === 'relationship') {
        return true;
      }
      if (fLower.includes('map position') || fLower.includes('coordinates')) {
        return true;
      }
      if (fLower.includes('ecotone') || fLower.includes('transition zone')) {
        return true;
      }
    }

    if (catName === 'Relationships') {
      // User request: remove random "funding" and "key people" fields from the relationships section
      if (
        fLower === 'funding' ||
        fLower.includes('funding') ||
        fLower === 'key people' ||
        fLower.includes('key people') ||
        fLower.includes('secondary collaboration')
      ) {
        return true;
      }
    }
    if (catName === 'Logistic Info') {
      // Remove website url, socials, logo, favicon, language, description, and country from Logistic Info section
      if (
        fLower === 'website url' ||
        fLower === 'website' ||
        fLower.includes('social profile') ||
        fLower.includes('social media') ||
        fLower === 'logo' ||
        fLower === 'favicon' ||
        fLower === 'language' ||
        fLower === 'language(s)' ||
        fLower === 'languages' ||
        fLower.startsWith('language') ||
        fLower === 'description' ||
        fLower === 'country'
      ) {
        return true;
      }
    }
    if (catName === 'Warm Data') {
      // User request d: remove "social profiles" field from the "warm data" section
      if (
        fLower === 'social profile' ||
        fLower === 'social profile(s)' ||
        fLower === 'social profiles' ||
        fLower.includes('social profile') ||
        fLower.includes('social media')
      ) {
        return true;
      }
    }
    return false;
  };

  const activeCategories = useMemo(() => {
    let list = Object.entries(categorizedData)
      .map(([catName, fields]) => {
        const filteredFields: Record<string, any> = {};
        Object.entries(fields).forEach(([k, v]) => {
          if (!isExcludedField(catName, k)) {
            filteredFields[k] = v;
          }
        });

        // Always show in "Overview": "Category", "Keywords/Topics" and "Who They Serve" (Other Archipelagos moved to below main Archipelago field)
        if (catName === 'Overview') {
          if (!('Category' in filteredFields)) {
            filteredFields['Category'] = entity.category;
          }
          delete filteredFields['Other Archipelagos'];
          delete filteredFields['other archipelagos'];
          delete filteredFields['Other Archipelago'];
          delete filteredFields['other archipelago'];
          delete filteredFields['Island/Cluster'];
          delete filteredFields['island/cluster'];
          delete filteredFields['Islands'];
          delete filteredFields['islands'];

          // Clean Keywords/Topics so other archipelagos do NOT duplicate here in the profile
          const rawKeywordsVal = ('Keywords/Topics' in filteredFields)
            ? String(filteredFields['Keywords/Topics'] ?? '')
            : (entity.fields && entity.fields.length > 0)
              ? entity.fields.join(', ')
              : (entity.extraFields?.['Keywords/Topics'] as string) || '';
          const cleanedKeywordsList = filterProfileTags(rawKeywordsVal, entity);
          filteredFields['Keywords/Topics'] = cleanedKeywordsList.join(', ');
          if (!('Who They Serve' in filteredFields)) {
            filteredFields['Who They Serve'] = (entity.extraFields?.['Who They Serve'] as string) ||
              (entity.extraFields?.['who they serve'] as string) || '';
          }
        }

        // Show "Practices" and "Offerings" in "Worldview & Change Orientation" always ONLY in community contribution mode (Help us improve this data).
        // In regular view, only show them if non-empty.
        if (catName === 'Worldview & Change Orientation') {
          if (isContributing) {
            if (!('Practices' in filteredFields)) {
              filteredFields['Practices'] = (entity.extraFields?.['Practices'] as string) ||
                (entity.categorizedFields?.['Worldview & Change Orientation']?.['Practices'] as string) || '';
            }
            if (!('Offerings' in filteredFields)) {
              filteredFields['Offerings'] = (entity.extraFields?.['Offerings'] as string) ||
                (entity.categorizedFields?.['Worldview & Change Orientation']?.['Offerings'] as string) || '';
            }
          } else {
            // In regular view (not community contribution mode), remove Practices and Offerings if they are empty
            if (filteredFields['Practices'] !== undefined && String(filteredFields['Practices'] ?? '').trim() === '') {
              delete filteredFields['Practices'];
            }
            if (filteredFields['Offerings'] !== undefined && String(filteredFields['Offerings'] ?? '').trim() === '') {
              delete filteredFields['Offerings'];
            }
          }
        }

        return [catName, filteredFields] as [string, Record<string, any>];
      })
      .filter(([catName, fields]) => {
        if (catName === 'Relationships' && reciprocalNodes.length > 0) return true;
        if (catName === 'Overview') return true;
        if (catName === 'Worldview & Change Orientation' && isContributing) return true;
        return Object.keys(fields).length > 0;
      });

    // Ensure Overview is present if not already
    if (!list.some(([c]) => c === 'Overview')) {
      const cleanedKw = filterProfileTags(entity.fields || [], entity);
      list.unshift(['Overview', {
        'Category': entity.category,
        'Keywords/Topics': cleanedKw.join(', '),
        'Who They Serve': (entity.extraFields?.['Who They Serve'] as string) || ''
      }]);
    }

    // Ensure Worldview & Change Orientation is present ONLY when in contribution mode if not already
    if (isContributing && !list.some(([c]) => c === 'Worldview & Change Orientation')) {
      list.push(['Worldview & Change Orientation', {
        'Practices': (entity.extraFields?.['Practices'] as string) ||
          (entity.categorizedFields?.['Worldview & Change Orientation']?.['Practices'] as string) || '',
        'Offerings': (entity.extraFields?.['Offerings'] as string) ||
          (entity.categorizedFields?.['Worldview & Change Orientation']?.['Offerings'] as string) || ''
      }]);
    }

    // Ensure Relationships is in the list if there are reciprocal nodes even if no direct fields
    if (reciprocalNodes.length > 0 && !list.some(([c]) => c === 'Relationships')) {
      const overviewIdx = list.findIndex(([c]) => c === 'Overview');
      const insertAt = overviewIdx >= 0 ? overviewIdx + 2 : 0;
      list.splice(insertAt, 0, ['Relationships', {}]);
    }

    // Filter by onlyCategory if specified
    if (onlyCategory) {
      const targetCat = onlyCategory.toLowerCase().trim();
      list = list.filter(([catName]) => catName.toLowerCase().trim() === targetCat);
    }

    // Filter out excludeCategories if specified
    if (excludeCategories && excludeCategories.length > 0) {
      const excludedLower = excludeCategories.map(c => c.toLowerCase().trim());
      list = list.filter(([catName]) => !excludedLower.includes(catName.toLowerCase().trim()));
    }

    // Filter out excludeFields if specified
    if (excludeFields && excludeFields.length > 0) {
      const excludedFldLower = excludeFields.map(f => f.toLowerCase().trim());
      list = list.map(([catName, fields]) => {
        const remaining: Record<string, any> = {};
        Object.entries(fields).forEach(([k, v]) => {
          if (!excludedFldLower.includes(k.toLowerCase().trim())) {
            remaining[k] = v;
          }
        });
        return [catName, remaining] as [string, Record<string, any>];
      });
    }

    return list;
  }, [categorizedData, reciprocalNodes, isContributing, editMode, entity, onlyCategory, excludeCategories, excludeFields]);

  if (activeCategories.length === 0 && !editMode) {
    return null;
  }

  return (
    <div className="space-y-3">
      {!hideHeaderTitle && (
        <div className="flex items-center justify-between">
          <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider">
            Categorized Ecosystem Fields
          </h3>
          <span className="font-technical text-[10px] text-[#8C877F]">
            {activeCategories.length} Categories ({Object.values(categorizedData).reduce((acc: number, obj) => acc + Object.keys(obj).length, 0)} Fields)
          </span>
        </div>
      )}

      <div className="space-y-2.5">
        {activeCategories.map(([catName, fields]) => {
          const isOpen = openCategories[catName] !== false;
          const icon = CATEGORY_ICONS[catName] || '📋';
          const colors = CATEGORY_COLORS[catName] || CATEGORY_COLORS['Overview'];
          const isOverviewCategory = catName === 'Overview';
          const rawEntries = Object.entries(fields);
          const fieldEntries = rawEntries.filter(([k, v]) => {
            if (v === undefined || v === null || String(v).trim() === '') return false;
            if (isOverviewCategory) {
              const kLower = k.toLowerCase().trim();
              if (
                kLower === 'category' ||
                kLower === 'experimental category' ||
                kLower === 'filled fields' ||
                kLower === 'filledfields' ||
                kLower === 'fields filled' ||
                kLower === 'count of filled fields' ||
                kLower === 'quadrant' ||
                kLower === 'quadrants' ||
                kLower === 'map placement' ||
                kLower === 'archipelago' ||
                kLower === 'archipelagos' ||
                kLower === 'island/cluster' ||
                kLower === 'islands' ||
                kLower === 'island' ||
                kLower === 'cluster' ||
                kLower === 'continent' ||
                kLower === 'featured?' ||
                kLower === 'featured'
              ) {
                return false;
              }
            }
            return true;
          });
          const isRelationshipCategory = catName === 'Relationships';
          const relationshipNodeCount = isRelationshipCategory
            ? (fieldEntries.reduce((acc, [_, v]) => acc + parseInstitutionList(v).length, 0) + reciprocalNodes.length)
            : fieldEntries.length;

          return (
            <div
              key={catName}
              className="border border-[#E5E7EB] rounded-[5px] overflow-hidden bg-white shadow-2xs transition-all"
            >
              {/* Category Header Bar */}
              <button
                type="button"
                onClick={() => toggleCategory(catName)}
                className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                style={{ borderLeft: `3px solid ${colors.text}` }}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-xs select-none">{icon}</span>
                  <span className="font-editorial text-xs font-semibold text-[#111827] truncate">
                    {catName}
                  </span>
                  <span
                    className="font-technical text-[9px] px-1.5 py-0.5 rounded-[2px] font-bold uppercase shrink-0"
                    style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                  >
                    {isRelationshipCategory ? `${relationshipNodeCount} ${relationshipNodeCount === 1 ? 'Node' : 'Nodes'}` : fieldEntries.length}
                  </span>
                </div>
                <span className="text-[#8C877F] p-0.5 shrink-0">
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {/* Fields List */}
              {isOpen && (
                <div className="p-2.5 bg-[#FAF8F5]/60 border-t border-[#E5E7EB] space-y-2">
                  {(() => {
                    const sortedEntries = [...fieldEntries];
                    if (catName === 'Overview') {
                      const OVERVIEW_ORDER = ['Keywords/Topics', 'Who They Serve'];
                      sortedEntries.sort((a, b) => {
                        const idxA = OVERVIEW_ORDER.indexOf(a[0]);
                        const idxB = OVERVIEW_ORDER.indexOf(b[0]);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return a[0].localeCompare(b[0]);
                      });
                    }
                    return sortedEntries.map(([fieldKey, val]) => {
                      const strVal = String(val ?? '').trim();
                      const isUrl = /^https?:\/\//i.test(strVal) || /^www\./i.test(strVal);
                      const isRelationshipField = catName === 'Relationships';
                      const isNarrativeCategory =
                        catName === 'Worldview & Change Orientation' ||
                        catName === 'Warm Data' ||
                        catName === 'Discourse Analysis / Argument Mapping';
                      const isSocialProfiles = fieldKey.toLowerCase().includes('social profile');
                      const isImage = (fieldKey.toLowerCase() === 'logo' || fieldKey.toLowerCase() === 'favicon') && isUrl;

                      // Overview specific fields
                      const fKeyLower = fieldKey.toLowerCase().trim();
                      const isOverviewCategory = catName === 'Overview';
                      const isCategoryField = isOverviewCategory && (fKeyLower === 'category' || fKeyLower === 'quadrant');

                      // Request: within "overview": category, filled fields, quadrant, archipelago, other archipelagos shouldn't appear
                      if (isOverviewCategory) {
                        if (
                          fKeyLower === 'category' ||
                          fKeyLower === 'filled fields' ||
                          fKeyLower === 'filledfields' ||
                          fKeyLower === 'quadrant' ||
                          fKeyLower === 'archipelago' ||
                          fKeyLower === 'other archipelagos' ||
                          fKeyLower === 'other archipelago' ||
                          fKeyLower === 'island/cluster' ||
                          fKeyLower === 'islands' ||
                          fKeyLower === 'island' ||
                          fKeyLower === 'continent'
                        ) {
                          return null;
                        }
                      }

                      const isOtherArchipelagosField = isOverviewCategory && (
                        fKeyLower === 'other archipelagos' ||
                        fKeyLower === 'other archipelago' ||
                        fKeyLower === 'islands' ||
                        fKeyLower === 'island/cluster'
                      );
                      const isKeywordsTopicsField = isOverviewCategory && (
                        fKeyLower === 'keywords/topics' ||
                        fKeyLower === 'keywords / topics' ||
                        fKeyLower === 'keywords' ||
                        fKeyLower === 'topics'
                      );

                      // Detect Relevant Resources, Corresponding Database, and any hyperlinked fields
                      const isResourceOrDbField =
                        fKeyLower === 'relevant resources' ||
                        fKeyLower === 'corresponding database' ||
                        fKeyLower === 'featured resources' ||
                        fKeyLower.includes('relevant resource') ||
                        fKeyLower.includes('corresponding database') ||
                        fKeyLower.includes('featured resource') ||
                        fKeyLower.includes('external database') ||
                        fKeyLower === 'database' ||
                        (fKeyLower.includes('resource') && !fKeyLower.includes('inner'));

                      const parsedLinks = parseResourceLinks(strVal);
                      const hasLinks = parsedLinks.some(l => !!l.url);
                      const shouldRenderAsResourceLinks = isResourceOrDbField || (hasLinks && !isRelationshipField && !isSocialProfiles && !isImage);

                      const isLongText = strVal.length > 40 || strVal.includes('\n');
                      const isOverviewTagsField = isOtherArchipelagosField || isKeywordsTopicsField;
                      // Relationships fields & tag badge fields must always display results below the label, never squished on the right
                      const isStacked = isOverviewTagsField || shouldRenderAsResourceLinks || isRelationshipField || isNarrativeCategory || isLongText || fieldKey.length > 25;

                    return (
                      <div
                        key={fieldKey}
                        className={`rounded-[4px] border border-[#E5E7EB] bg-white transition-all ${
                          isStacked ? 'p-2.5 space-y-1.5' : 'p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5'
                        }`}
                      >
                        {/* Label */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                            <span className="font-technical text-[10px] font-semibold text-[#4B5563] uppercase tracking-wider break-words leading-snug">
                              {renderFieldLabel(fieldKey)}
                            </span>
                            <FieldCommentInfo fieldName={fieldKey} />
                          </div>
                          {isRelationshipField && (() => {
                            const items = parseInstitutionList(strVal);
                            if (items.length > 0) {
                              return (
                                <span className="font-technical text-[9px] text-[#4B5563] bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.2 rounded-[2px]">
                                  {items.length} {items.length === 1 ? 'Node' : 'Nodes'}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* Value rendering */}
                        {editMode ? (
                          isRelationshipField ? (
                            <div className="space-y-1.5 w-full">
                              <textarea
                                value={strVal}
                                onChange={(e) => handleUpdateFieldValue(catName, fieldKey, e.target.value)}
                                className="w-full text-xs font-sans p-1.5 border border-[#E5E7EB] rounded-[3px] bg-white resize-y min-h-[50px] outline-none focus:border-[#5B21B6]"
                                rows={2}
                                placeholder="Comma-separated entities/people (e.g. Life Itself, Schumacher College)..."
                              />
                              {(() => {
                                const items = parseInstitutionList(strVal);
                                const role = getRoleForFieldKey(fieldKey);
                                if (items.length === 0) return null;
                                return (
                                  <div className="space-y-1 pt-1 border-t border-dashed border-[#E5E7EB]">
                                    <span className="font-technical text-[9px] text-[#8C877F] uppercase tracking-wider block font-semibold">
                                      Clickable Node Preview:
                                    </span>
                                    <div className="space-y-1">
                                      {items.map((itemName, itemIdx) =>
                                        renderConnectedNodeCard(itemName, role, `preview-${fieldKey}-${itemIdx}`)
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : shouldRenderAsResourceLinks ? (
                            <div className="space-y-1.5 w-full">
                              <input
                                type="text"
                                value={strVal}
                                onChange={(e) => handleUpdateFieldValue(catName, fieldKey, e.target.value)}
                                className="w-full text-xs font-sans p-1.5 border border-[#E5E7EB] rounded-[3px] bg-white outline-none focus:border-[#5B21B6]"
                                placeholder="e.g. [Documentation](https://...), [Database](https://...)"
                              />
                              {strVal && hasLinks && (
                                <div className="pt-0.5">
                                  <span className="font-technical text-[9px] text-[#8C877F] uppercase tracking-wider block font-semibold mb-1">
                                    Clickable Link Preview:
                                  </span>
                                  <ClickableResourceLinks value={strVal} fieldName={fieldKey} />
                                </div>
                              )}
                            </div>
                          ) : isCategoryField ? (
                            <select
                              value={strVal || entity.category}
                              onChange={(e) => handleUpdateFieldValue(catName, fieldKey, e.target.value)}
                              className="w-full sm:w-2/3 text-xs font-sans p-1 border border-[#E5E7EB] rounded-[3px] bg-white outline-none focus:border-[#5B21B6]"
                            >
                              <option value="Inner">Inner</option>
                              <option value="Social">Social</option>
                              <option value="Cultural">Cultural</option>
                              <option value="Systems">Systems</option>
                            </select>
                          ) : isOtherArchipelagosField ? (
                            <input
                              type="text"
                              value={strVal}
                              onChange={(e) => handleUpdateFieldValue(catName, fieldKey, e.target.value)}
                              className="w-full text-xs font-sans p-1.5 border border-[#E5E7EB] rounded-[3px] bg-white outline-none focus:border-[#5B21B6]"
                              placeholder="Comma-separated other archipelagos (e.g. 4. Contemplative Education, 22. Regenerative Education)..."
                            />
                          ) : isKeywordsTopicsField ? (
                            <textarea
                              value={strVal}
                              onChange={(e) => handleUpdateFieldValue(catName, fieldKey, e.target.value)}
                              className="w-full text-xs font-sans p-1.5 border border-[#E5E7EB] rounded-[3px] bg-white resize-y min-h-[50px] outline-none focus:border-[#5B21B6]"
                              rows={2}
                              placeholder="Comma-separated keywords/topics..."
                            />
                          ) : isStacked ? (
                            <textarea
                              value={strVal}
                              onChange={(e) => handleUpdateFieldValue(catName, fieldKey, e.target.value)}
                              className="w-full text-xs font-sans p-1.5 border border-[#E5E7EB] rounded-[3px] bg-white resize-y min-h-[50px] outline-none focus:border-[#5B21B6]"
                              rows={2}
                              placeholder={
                                fieldKey === 'Practices'
                                  ? 'e.g. Contemplative practices, meditation, dialogue circles...'
                                  : fieldKey === 'Offerings'
                                  ? 'e.g. Workshops, retreats, publications, courses...'
                                  : `Enter ${fieldKey}...`
                              }
                            />
                          ) : (
                            <input
                              type="text"
                              value={strVal}
                              onChange={(e) => handleUpdateFieldValue(catName, fieldKey, e.target.value)}
                              className="w-full sm:w-2/3 text-xs font-sans p-1 border border-[#E5E7EB] rounded-[3px] bg-white outline-none focus:border-[#5B21B6]"
                            />
                          )
                        ) : isRelationshipField ? (
                          /* Clickable linked nodes instead of text-only fields */
                          (() => {
                            const items = parseInstitutionList(strVal);
                            const role = getRoleForFieldKey(fieldKey);
                            if (items.length === 0) {
                              return (
                                <div className="font-sans text-xs text-[#9CA3AF] italic bg-[#FAF8F5] p-2 border border-[#E5E7EB] rounded-[3px]">
                                  None listed
                                </div>
                              );
                            }
                            return (
                              <div className="space-y-1.5 pt-0.5">
                                {items.map((itemName, itemIdx) =>
                                  renderConnectedNodeCard(itemName, role, `${fieldKey}-${itemIdx}`)
                                )}
                              </div>
                            );
                          })()
                        ) : isSocialProfiles ? (
                          /* Broken-down Social Profiles with icons */
                          <div className="flex flex-col gap-1 min-w-0">
                            {(() => {
                              const parsedSocials = parseSocialProfilesField(strVal);
                              const parsedEntries = Object.entries(parsedSocials).filter(
                                ([platform, url]) => !isTransformationFocusValue(platform) && !isTransformationFocusValue(url)
                              );
                              if (parsedEntries.length > 0) {
                                return (
                                  <div className="flex items-center flex-wrap gap-1.5">
                                    {parsedEntries.map(([platform, url]) => {
                                      const Icon = getSocialIconByPlatform(platform);
                                      if (!isEnlarged) {
                                        return (
                                          <a
                                            key={platform}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center p-1.5 bg-white border border-[#E5E7EB] hover:border-[#111827] hover:bg-[#FAF8F5] text-[#4B5563] hover:text-[#111827] rounded-[4px] transition-all shadow-2xs group"
                                            title={`${getSocialPlatformLabel(platform as any)}: ${url}`}
                                            aria-label={getSocialPlatformLabel(platform as any)}
                                          >
                                            <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                          </a>
                                        );
                                      }
                                      return (
                                        <a
                                          key={platform}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#FAF8F5] hover:bg-white border border-[#E5E7EB] hover:border-[#111827] rounded-[3px] text-[10.5px] font-technical text-[#111827] transition-all group shadow-2xs"
                                          title={`${getSocialPlatformLabel(platform as any)}: ${url}`}
                                        >
                                          <Icon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                          <span className="capitalize">{platform}</span>
                                          <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                                        </a>
                                      );
                                    })}
                                  </div>
                                );
                              }
                              return <span className="font-sans text-xs text-[#111827] break-all">{strVal}</span>;
                            })()}
                          </div>
                        ) : shouldRenderAsResourceLinks ? (
                          /* Clickable Resource and Database links */
                          <div className="w-full pt-0.5">
                            <ClickableResourceLinks value={strVal} fieldName={fieldKey} />
                          </div>
                        ) : isImage ? (
                          /* Logo or Favicon preview */
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-[3px] border border-[#E5E7EB] bg-white p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                              <img src={strVal} alt="" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                            </div>
                            <a
                              href={strVal}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-technical text-xs text-[#0284C7] hover:underline flex items-center space-x-1 truncate max-w-[200px]"
                            >
                              <span className="truncate">{strVal}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          </div>
                        ) : isCategoryField ? (
                          /* Clickable Category Quadrant */
                          (() => {
                            const catValue = (strVal || entity.category) as CategoryQuadrant;
                            const catColor = catValue === 'Inner' ? { bg: '#F3E8FF', text: '#5B21B6', border: '#D8B4FE', dot: '#5B21B6' } :
                              catValue === 'Social' ? { bg: '#F3F4F6', text: '#111827', border: '#D1D5DB', dot: '#111827' } :
                              catValue === 'Cultural' ? { bg: '#F7FEE7', text: '#3F6212', border: '#D9F99D', dot: '#7D8764' } :
                              { bg: '#F0F9FF', text: '#0369A1', border: '#BAE6FD', dot: '#0284C7' };

                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectCategory) {
                                    onSelectCategory(catValue);
                                  }
                                }}
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[4px] border font-sans text-xs font-semibold shadow-2xs hover:shadow-xs hover:scale-[1.02] transition-all cursor-pointer group"
                                style={{
                                  backgroundColor: catColor.bg,
                                  color: catColor.text,
                                  borderColor: catColor.border
                                }}
                                title={`Click to show all ${catValue} quadrant entities on map and right sidebar`}
                              >
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor.dot }} />
                                <span className="select-text">{catValue} Change</span>
                                <span className="text-[10px] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">→</span>
                              </button>
                            );
                          })()
                        ) : isOtherArchipelagosField ? (
                          /* Clickable Other Archipelagos badges (only archipelagos other than the first assigned one) */
                          (() => {
                            const otherArchs = getEntityOtherArchipelagos(entity);
                            if (otherArchs.length === 0) {
                              return (
                                <span className="font-sans text-xs text-[#8C877F] italic select-text">
                                  None
                                </span>
                              );
                            }
                            return (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {otherArchs.map(archName => (
                                  <button
                                    key={archName}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSelectArchipelago) {
                                        onSelectArchipelago(archName);
                                      }
                                    }}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-[#FAF8F5] border border-[#5B21B6]/30 hover:border-[#5B21B6] text-[#5B21B6] rounded-[4px] font-sans text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer group text-left"
                                    title={`Click to show all entities in "${archName}" on map and right sidebar`}
                                  >
                                    <Globe className="w-3 h-3 text-[#5B21B6] shrink-0 group-hover:scale-110 transition-transform" />
                                    <span className="font-medium select-text">{archName}</span>
                                    <span className="text-[10px] text-[#5B21B6]/60 group-hover:text-[#5B21B6] ml-0.5">→</span>
                                  </button>
                                ))}
                              </div>
                            );
                          })()
                        ) : isKeywordsTopicsField ? (
                          /* Clickable Keywords/Topics tag badges */
                          (() => {
                            const rawList = (entity.fields && entity.fields.length > 0)
                              ? entity.fields
                              : strVal.split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
                            const tags = filterProfileTags(rawList, entity);

                            if (tags.length === 0) {
                              return (
                                <span className="font-sans text-xs text-[#9CA3AF] italic select-text">
                                  None listed
                                </span>
                              );
                            }
                            return (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {tags.map(tag => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSelectTag) {
                                        onSelectTag(tag);
                                      }
                                    }}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-[#FAF8F5] hover:bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#111827] rounded-[4px] font-sans text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer group text-left"
                                    title={`Click to show all entities with keyword "${tag}" on map and right sidebar`}
                                  >
                                    <Tag className="w-2.5 h-2.5 text-[#7D8764] shrink-0 group-hover:scale-110 transition-transform" />
                                    <span className="font-medium select-text">{tag}</span>
                                    <span className="text-[10px] text-[#8C877F] group-hover:text-[#111827] ml-0.5">→</span>
                                  </button>
                                ))}
                              </div>
                            );
                          })()
                        ) : isUrl ? (
                          /* Clickable URL */
                          <a
                            href={strVal.startsWith('http') ? strVal : `https://${strVal}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-technical text-xs text-[#0284C7] hover:underline flex items-center space-x-1 truncate max-w-[220px]"
                          >
                            <span className="truncate">{formatDisplayUrl(strVal)}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          </a>
                        ) : isStacked ? (
                          /* Long-form narrative text card below label */
                          <div className="font-sans text-xs text-[#374151] leading-relaxed bg-[#FAF8F5] p-2 border border-[#E5E7EB] rounded-[3px] whitespace-pre-line">
                            {strVal || <span className="text-[#9CA3AF] italic">None listed</span>}
                          </div>
                        ) : (
                          /* Short value */
                          <span className="font-sans text-xs font-medium text-[#111827] text-right sm:text-left">
                            {strVal}
                          </span>
                        )}
                      </div>
                    );
                  });
                })()}

                  {/* Reciprocal Connections inside Relationships Category */}
                  {isRelationshipCategory && reciprocalNodes.length > 0 && (
                    <div className="rounded-[4px] border border-[#E5E7EB] bg-white transition-all p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="font-technical text-[10px] font-semibold text-[#4B5563] uppercase tracking-wider">
                            Reciprocal Ecosystem Connections
                          </span>
                        </div>
                        <span className="font-technical text-[9px] text-[#4B5563] bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.2 rounded-[2px]">
                          {reciprocalNodes.length} {reciprocalNodes.length === 1 ? 'Node' : 'Nodes'}
                        </span>
                      </div>
                      <p className="font-sans text-[10.5px] text-[#6B7280]">
                        Other ecosystem nodes referencing this entity:
                      </p>
                      <div className="space-y-1.5 pt-0.5">
                        {reciprocalNodes.map((node, rIdx) =>
                          renderConnectedNodeCard(node.name, node.role, `recip-${rIdx}`, node.entity)
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface RightSidebarProps {
  entity: EcosystemEntity | null;
  activeListScope?: SidebarListScope | null;
  selectedContinentName?: string | null;
  continents?: ContinentInfo[];
  editMode: boolean;
  onClose: () => void;
  onCenterEntity?: (entity: EcosystemEntity) => void;
  isMapCentered?: boolean;
  onFocusEntity?: (entity: EcosystemEntity) => void;
  isMapFocused?: boolean;
  onFlyToContinent?: (continent: ContinentInfo) => void;
  onFlyToQuadrant?: (category: CategoryQuadrant) => void;
  onFlyToTag?: (tag: string, category?: CategoryQuadrant) => void;
  onSelectContinent?: (continentName: string | null) => void;
  onSelectCategoryList?: (category: CategoryQuadrant, entityType?: EntityType) => void;
  onSelectRelationshipList?: (relationship: string, entityType?: EntityType) => void;
  onSelectEntityTypeList?: (entityType: EntityType | 'All') => void;
  onSelectTagList?: (tag: string, category?: CategoryQuadrant, facetType?: 'tag' | 'approach' | 'issues' | 'activities') => void;
  onUpdateEntity: (updatedEntity: EcosystemEntity) => void;
  onUpdateEntityNotes: (id: string, notes: string) => void;
  onUpdateEntityCoordinates: (id: string, x: number, y: number) => void;
  onAddCommunityNote?: (entityId: string, author: string, content: string) => void;
  onDeleteCommunityNote?: (entityId: string, noteId: string) => void;
  allEntities: EcosystemEntity[];
  onSelectEntity: (entity: EcosystemEntity | null) => void;
  initialEnlarged?: boolean;
  enlargedOnly?: boolean;
  fullPageEmbedded?: boolean;
  onUpdateContinentQuadrant?: (continentName: string, newQuadrant: CategoryQuadrant) => void;
  onRenameContinent?: (oldName: string, newName: string) => void;
  onAddEntityToContinent?: (continentName: string, entityId: string) => void;
  onRemoveEntityFromContinent?: (continentName: string, entityId: string) => void;
  onUpdateContinentDescription?: (continentName: string, description: string) => void;
  onResetContinentShape?: (continentName: string) => void;
  onMoveContinentLabel?: (continentName: string, deltaX: number, deltaY: number) => void;
  onResetContinentLabel?: (continentName: string) => void;
  onMoveContinentSubLabel?: (continentName: string, deltaX: number, deltaY: number) => void;
  onResetContinentSubLabel?: (continentName: string) => void;
  onUpdateContinentCurvature?: (continentName: string, titleCurvature?: number, subTitleCurvature?: number) => void;
  onUpdateAllContinentsCurvature?: (titleCurvature: number, subTitleCurvature?: number) => void;
  onResetContinentCurvature?: (continentName: string) => void;
  onRotateContinentLabel?: (continentName: string, rotation: number, isSubLabel?: boolean, linkBoth?: boolean) => void;
  onResetContinentRotation?: (continentName: string) => void;
  onScaleContinent?: (continentName: string, factor: number) => void;
  onFitContinentTightly?: (continentName: string) => void;
  setEditMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenPositionSnapshotModal?: () => void;
  quadrantSizes?: LayerQuadrantSizes;
  onUpdateQuadrantSizes?: (newSizes: LayerQuadrantSizes, targetLayer?: 1 | 2 | 3 | 'all') => void;
  activeLayer?: 1 | 2 | 3 | 'all';
  onSelectLayer?: (layer: 1 | 2 | 3 | 'all') => void;
  onResetQuadrantSizes?: (layer?: 1 | 2 | 3 | 'all') => void;
  onAutoFitQuadrantSizes?: (layer?: 1 | 2 | 3 | 'all') => void;
  allLayerQuadrantSizes?: LayerQuadrantConfig;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  entity,
  activeListScope,
  selectedContinentName,
  continents = [],
  editMode,
  onClose,
  onCenterEntity,
  isMapCentered = false,
  onFocusEntity,
  isMapFocused = false,
  onFlyToContinent,
  onFlyToQuadrant,
  onFlyToTag,
  onSelectContinent,
  onSelectCategoryList,
  onSelectRelationshipList,
  onSelectEntityTypeList,
  onSelectTagList,
  onUpdateEntity,
  onUpdateEntityNotes,
  onUpdateEntityCoordinates,
  onAddCommunityNote,
  onDeleteCommunityNote,
  allEntities,
  onSelectEntity,
  initialEnlarged = false,
  enlargedOnly = false,
  fullPageEmbedded = false,
  onUpdateContinentQuadrant,
  onRenameContinent,
  onAddEntityToContinent,
  onRemoveEntityFromContinent,
  onUpdateContinentDescription,
  onResetContinentShape,
  onMoveContinentLabel,
  onResetContinentLabel,
  onMoveContinentSubLabel,
  onResetContinentSubLabel,
  onUpdateContinentCurvature,
  onUpdateAllContinentsCurvature,
  onResetContinentCurvature,
  onRotateContinentLabel,
  onResetContinentRotation,
  onScaleContinent,
  onFitContinentTightly,
  setEditMode,
  onOpenPositionSnapshotModal,
  quadrantSizes,
  onUpdateQuadrantSizes,
  activeLayer = 1,
  onSelectLayer,
  onResetQuadrantSizes,
  onAutoFitQuadrantSizes,
  allLayerQuadrantSizes,
}) => {
  const [newTagInput, setNewTagInput] = useState('');
  const [snapshotSearch, setSnapshotSearch] = useState('');
  const [isEnlarged, setIsEnlarged] = useState(initialEnlarged || enlargedOnly || fullPageEmbedded);
  const [unmappedPopupEntity, setUnmappedPopupEntity] = useState<string | null>(null);
  const [isSidebarQuadrantOpen, setIsSidebarQuadrantOpen] = useState(false);

  const activeQuadrantSizes = useMemo(() => {
    return quadrantSizes || getQuadrantSizesForLayer(activeLayer, allLayerQuadrantSizes);
  }, [quadrantSizes, activeLayer, allLayerQuadrantSizes]);

  // Archipelago editor states
  const [isEditingArchipelagoName, setIsEditingArchipelagoName] = useState(false);
  const [isEditingArchipelagoDetails, setIsEditingArchipelagoDetails] = useState(false);
  const [quadrantChangeFeedback, setQuadrantChangeFeedback] = useState<string | null>(null);
  const [archipelagoNameDraft, setArchipelagoNameDraft] = useState('');
  const [archipelagoDescDraft, setArchipelagoDescDraft] = useState('');
  const [isArchipelagoDescSaved, setIsArchipelagoDescSaved] = useState(false);
  const [archipelagoAddSearch, setArchipelagoAddSearch] = useState('');
  const [showAddEntityDropdown, setShowAddEntityDropdown] = useState(false);
  const addEntityContainerRef = useRef<HTMLDivElement>(null);
  const [isCurvatureLinked, setIsCurvatureLinked] = useState(true);
  const [isRotationLinked, setIsRotationLinked] = useState(true);
  const [curvatureFeedback, setCurvatureFeedback] = useState<string | null>(null);

  // Community "Help us improve this data" contribution pipeline states
  const [isContributing, setIsContributing] = useState(false);
  const [draftEntity, setDraftEntity] = useState<EcosystemEntity | null>(null);
  const [submitterRelationship, setSubmitterRelationship] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);

  // Synchronize enlarged state if entity changes or props change
  useEffect(() => {
    if (initialEnlarged || enlargedOnly || fullPageEmbedded) {
      setIsEnlarged(true);
    }
  }, [entity?.id, initialEnlarged, enlargedOnly, fullPageEmbedded]);

  // Reset enlarged state and contribution mode if entity is closed or deselected
  useEffect(() => {
    if (!entity) {
      setIsEnlarged(false);
    }
    setIsContributing(false);
    setDraftEntity(null);
    setIsEmailModalOpen(false);
    setIsSuccessModalOpen(false);
    setSubmitterEmail('');
    setEmailError(null);
  }, [entity?.id]);

  const handleSelectCategoryFromOverview = (cat: CategoryQuadrant) => {
    if (isEnlarged) setIsEnlarged(false);
    if (enlargedOnly || fullPageEmbedded) onClose();
    onSelectEntity(null);
    onSelectContinent?.(null);
    onSelectCategoryList?.(cat);
    onFlyToQuadrant?.(cat);
  };

  const handleSelectArchipelagoFromOverview = (archName: string) => {
    if (isEnlarged) setIsEnlarged(false);
    if (enlargedOnly || fullPageEmbedded) onClose();
    onSelectEntity(null);
    onSelectContinent?.(archName);
    const targetCont = continents.find(c => c.name === archName || formatClusterWithNumber(c.name).toLowerCase() === formatClusterWithNumber(archName).toLowerCase());
    if (targetCont && onFlyToContinent) {
      onFlyToContinent(targetCont);
    }
  };

  const handleSelectTagFromOverview = (tag: string) => {
    if (isEnlarged) setIsEnlarged(false);
    if (enlargedOnly || fullPageEmbedded) onClose();
    onSelectEntity(null);
    onSelectContinent?.(null);
    onSelectTagList?.(tag, entity?.category, 'tag');
    onFlyToTag?.(tag, entity?.category);
  };

  // Keyboard shortcut: Escape to exit enlarged focus mode or close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (enlargedOnly || fullPageEmbedded) {
          onClose();
        } else if (isEnlarged) {
          setIsEnlarged(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnlarged, enlargedOnly, fullPageEmbedded, onClose]);

  // Social media links for the current entity (defined at top level to obey React Hook Rules)
  const socialLinks: SocialLink[] = useMemo(() => {
    if (!entity) return [];
    return extractSocialLinks(entity).filter(link => 
      !isTransformationFocusValue(link.url) &&
      !isTransformationFocusValue(link.label) &&
      !isTransformationFocusValue(link.handle)
    );
  }, [entity]);


  // Derived individual Approach, Issues, and Activities facets
  const entityApproaches = useMemo(() => {
    if (!entity) return [];
    if (entity.approach && entity.approach.length > 0) return entity.approach;
    const raw = entity.categorizedFields?.['Worldview & Change Orientation']?.['Approach'] || entity.extraFields?.['Approach'];
    if (raw) {
      return String(raw).split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
    }
    return [];
  }, [entity]);

  const entityIssues = useMemo(() => {
    if (!entity) return [];
    if (entity.issues && entity.issues.length > 0) return entity.issues;
    const raw = entity.categorizedFields?.['Worldview & Change Orientation']?.['Issues'] || entity.extraFields?.['Issues'];
    if (raw) {
      return String(raw).split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
    }
    return [];
  }, [entity]);

  const entityActivities = useMemo(() => {
    if (!entity) return [];
    if (entity.activities && entity.activities.length > 0) return entity.activities;
    const raw = entity.categorizedFields?.['Worldview & Change Orientation']?.['Activities'] || entity.extraFields?.['Activities'];
    if (raw) {
      return String(raw).split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
    }
    return [];
  }, [entity]);

  // Active entity displayed in enlarged focus modal (either draft during contribution or current entity)
  const modalEntity: EcosystemEntity | null = (isContributing && draftEntity) ? draftEntity : entity;

  const modalApproaches = useMemo(() => {
    if (!modalEntity) return [];
    if (modalEntity.approach && modalEntity.approach.length > 0) return modalEntity.approach;
    const raw = modalEntity.categorizedFields?.['Worldview & Change Orientation']?.['Approach'] || modalEntity.extraFields?.['Approach'];
    if (raw) return String(raw).split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
    return [];
  }, [modalEntity]);

  const modalIssues = useMemo(() => {
    if (!modalEntity) return [];
    if (modalEntity.issues && modalEntity.issues.length > 0) return modalEntity.issues;
    const raw = modalEntity.categorizedFields?.['Worldview & Change Orientation']?.['Issues'] || modalEntity.extraFields?.['Issues'];
    if (raw) return String(raw).split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
    return [];
  }, [modalEntity]);

  const modalActivities = useMemo(() => {
    if (!modalEntity) return [];
    if (modalEntity.activities && modalEntity.activities.length > 0) return modalEntity.activities;
    const raw = modalEntity.categorizedFields?.['Worldview & Change Orientation']?.['Activities'] || modalEntity.extraFields?.['Activities'];
    if (raw) return String(raw).split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
    return [];
  }, [modalEntity]);

  const modalFeaturedResources = useMemo(() => {
    if (!modalEntity) return '';
    return String(
      modalEntity.categorizedFields?.['Worldview & Change Orientation']?.['Featured Resources'] ||
      modalEntity.categorizedFields?.['Worldview & Change Orientation']?.['featured resources'] ||
      modalEntity.extraFields?.['Featured Resources'] ||
      modalEntity.extraFields?.['featured resources'] ||
      modalEntity.extraFields?.['__col_62'] ||
      ''
    ).trim();
  }, [modalEntity]);

  // Existing options across the entire ecosystem for autocomplete suggestions
  const allExistingTags = useMemo(() => {
    const set = new Set<string>();
    (allEntities || []).forEach(e => {
      (e.fields || []).forEach(f => { if (f?.trim()) set.add(f.trim()); });
    });
    return Array.from(set).sort();
  }, [allEntities]);

  const allExistingApproaches = useMemo(() => {
    const set = new Set<string>();
    (allEntities || []).forEach(e => {
      (e.approach || []).forEach(a => { if (a?.trim()) set.add(a.trim()); });
      const raw = e.categorizedFields?.['Overview']?.['Approach'] || e.extraFields?.['Approach'];
      if (raw) String(raw).split(/[,;|\n]+/).forEach(s => { if (s.trim()) set.add(s.trim()); });
    });
    return Array.from(set).sort();
  }, [allEntities]);

  const allExistingIssues = useMemo(() => {
    const set = new Set<string>();
    (allEntities || []).forEach(e => {
      (e.issues || []).forEach(i => { if (i?.trim()) set.add(i.trim()); });
      const raw = e.categorizedFields?.['Overview']?.['Issues'] || e.extraFields?.['Issues'];
      if (raw) String(raw).split(/[,;|\n]+/).forEach(s => { if (s.trim()) set.add(s.trim()); });
    });
    return Array.from(set).sort();
  }, [allEntities]);

  const allExistingActivities = useMemo(() => {
    const set = new Set<string>();
    (allEntities || []).forEach(e => {
      (e.activities || []).forEach(a => { if (a?.trim()) set.add(a.trim()); });
      const raw = e.categorizedFields?.['Overview']?.['Activities'] || e.extraFields?.['Activities'];
      if (raw) String(raw).split(/[,;|\n]+/).forEach(s => { if (s.trim()) set.add(s.trim()); });
    });
    return Array.from(set).sort();
  }, [allEntities]);

  const categoryColors: Record<string, string> = {
    Inner: '#5B21B6',
    Social: '#111827',
    Cultural: '#7D8764',
    Systems: '#0284C7'
  };

  // Determine current active list scope (either explicitly provided or from selectedContinentName)
  const currentScope: SidebarListScope | null = activeListScope || (selectedContinentName ? { type: 'continent', name: selectedContinentName } : null);

  const continentScopeName = currentScope?.type === 'continent' ? currentScope.name : null;

  // Synchronize archipelago name and description drafts when continent changes
  useEffect(() => {
    if (continentScopeName) {
      setArchipelagoNameDraft(continentScopeName);
      const activeContinent = (continents || []).find(c => 
        c.name === continentScopeName || 
        formatClusterWithNumber(c.name).toLowerCase() === formatClusterWithNumber(continentScopeName).toLowerCase() ||
        normalizeArchipelagoBaseName(c.name) === normalizeArchipelagoBaseName(continentScopeName)
      );
      setArchipelagoDescDraft(activeContinent?.description || '');
      setIsEditingArchipelagoName(false);
      setIsArchipelagoDescSaved(false);
      setIsEditingArchipelagoDetails(false);
      setQuadrantChangeFeedback(null);
      setArchipelagoAddSearch('');
      setShowAddEntityDropdown(false);
    }
  }, [continentScopeName, continents]);

  // Close add-entity dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addEntityContainerRef.current && !addEntityContainerRef.current.contains(event.target as Node)) {
        setShowAddEntityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If a list scope is active (and no individual entity is selected), render rich Entity Snapshot Overview List
  if (currentScope && !entity) {
    if (currentScope.type === 'continent') {
      const activeContinent = (continents || []).find(c => 
        c.name === currentScope.name || 
        formatClusterWithNumber(c.name).toLowerCase() === formatClusterWithNumber(currentScope.name).toLowerCase()
      );
      const listEntities = ensureUniqueEntityIds(allEntities.filter(e => entityMatchesArchipelago(e, currentScope.name)));
      const currentQuadrant = (activeContinent?.category || listEntities[0]?.category || 'Inner') as CategoryQuadrant;
      const badgeBg = categoryColors[currentQuadrant] || '#111827';
      const isArchipelagoEditable = editMode || isEditingArchipelagoDetails;

      // Candidate entities not yet belonging to this archipelago
      const candidatesToAdd = ensureUniqueEntityIds(
        allEntities.filter(e => !entityMatchesArchipelago(e, currentScope.name))
          .filter(e => {
            if (!archipelagoAddSearch.trim()) return true;
            const q = archipelagoAddSearch.toLowerCase();
            return (
              e.name.toLowerCase().includes(q) ||
              e.category.toLowerCase().includes(q) ||
              (e.type && e.type.toLowerCase().includes(q)) ||
              (e.fields && e.fields.some(f => f.toLowerCase().includes(q)))
            );
          })
      ).slice(0, 15);

      const filteredEntities = ensureUniqueEntityIds(
        listEntities.filter(e => {
          if (!snapshotSearch.trim()) return true;
          const q = snapshotSearch.toLowerCase();
          return (
            e.name.toLowerCase().includes(q) ||
            (e.description && e.description.toLowerCase().includes(q)) ||
            e.fields.some(f => f.toLowerCase().includes(q)) ||
            (e.location && e.location.toLowerCase().includes(q)) ||
            (e.type && e.type.toLowerCase().includes(q)) ||
            (e.stage && e.stage.toLowerCase().includes(q))
          );
        })
      );

      const handleFlyCamera = () => {
        if (onFlyToContinent) {
          if (activeContinent) {
            onFlyToContinent(activeContinent);
          } else if (listEntities.length > 0) {
            const avgX = listEntities.reduce((sum, e) => sum + e.x, 0) / listEntities.length;
            const avgY = listEntities.reduce((sum, e) => sum + e.y, 0) / listEntities.length;
            onFlyToContinent({
              name: currentScope.name,
              category: currentQuadrant,
              color: badgeBg,
              count: listEntities.length,
              centerX: avgX,
              centerY: avgY,
              minX: avgX - 50,
              maxX: avgX + 50,
              minY: avgY - 50,
              maxY: avgY + 50,
              pathData: '',
              labelPath: '',
              subLabelPath: '',
              visible: true,
              controlPoints: []
            });
          }
        }
      };

      const handleQuadrantChange = (newQuad: CategoryQuadrant) => {
        if (newQuad === currentQuadrant) return;
        if (onUpdateContinentQuadrant) {
          onUpdateContinentQuadrant(currentScope.name, newQuad);
          setQuadrantChangeFeedback(`Moved archipelago to ${newQuad} Quadrant`);
          setTimeout(() => setQuadrantChangeFeedback(null), 3500);
        }
      };

      return (
        <aside className="w-96 bg-white border-l border-[#E5E7EB] flex flex-col h-full z-30 shadow-lg relative select-text">
          {/* Header */}
          <div className="p-4 border-b border-[#E5E7EB] bg-[#FAF8F5]">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 pr-2">
                <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
                  {/* Quadrant Badge & Quick Switcher */}
                  <div className="flex items-center space-x-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: badgeBg }}
                    />
                    {onUpdateContinentQuadrant ? (
                      <div className="relative inline-flex items-center">
                        <select
                          value={currentQuadrant}
                          onChange={(e) => handleQuadrantChange(e.target.value as CategoryQuadrant)}
                          className="appearance-none font-technical text-[10.5px] uppercase font-bold text-white rounded-[3px] pl-2 pr-5 py-0.5 cursor-pointer shadow-2xs transition-all hover:opacity-95 focus:outline-none"
                          style={{ backgroundColor: badgeBg }}
                          title="Click to change this archipelago's quadrant"
                        >
                          <option value="Inner" className="bg-white text-[#111827] font-sans font-medium text-xs">Inner Quadrant</option>
                          <option value="Social" className="bg-white text-[#111827] font-sans font-medium text-xs">Social Quadrant</option>
                          <option value="Cultural" className="bg-white text-[#111827] font-sans font-medium text-xs">Cultural Quadrant</option>
                          <option value="Systems" className="bg-white text-[#111827] font-sans font-medium text-xs">Systems Quadrant</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-white absolute right-1 pointer-events-none opacity-85" />
                      </div>
                    ) : (
                      <span
                        className="px-2 py-0.5 text-[10px] font-technical uppercase font-semibold text-white rounded-[2px]"
                        style={{ backgroundColor: badgeBg }}
                      >
                        {currentQuadrant} Archipelago
                      </span>
                    )}
                  </div>

                  <span className="font-technical text-[10px] text-[#8C877F] uppercase">
                    {listEntities.length} {listEntities.length === 1 ? 'Entity' : 'Entities'}
                  </span>

                  {editMode ? (
                    <span className="px-1.5 py-0.5 text-[9px] font-technical uppercase font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] rounded-[2px] flex items-center gap-1">
                      <Edit3 className="w-2.5 h-2.5" /> Edit Mode
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingArchipelagoDetails(true);
                        setEditMode?.(true);
                      }}
                      className="px-1.5 py-0.5 text-[9.5px] font-technical uppercase font-bold bg-white hover:bg-[#FAF8F5] text-[#111827] border border-[#E5E7EB] hover:border-[#111827] rounded-[2px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Edit this archipelago's quadrant, name and details"
                    >
                      <Edit3 className="w-2.5 h-2.5 text-[#5B21B6]" />
                      <span>Edit Details</span>
                    </button>
                  )}
                </div>

                {/* Archipelago Name / Inline Rename */}
                {isArchipelagoEditable && isEditingArchipelagoName ? (
                  <div className="space-y-1.5 mt-1">
                    <input
                      type="text"
                      autoFocus
                      value={archipelagoNameDraft}
                      onChange={(e) => setArchipelagoNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (archipelagoNameDraft.trim()) {
                            onRenameContinent?.(currentScope.name, archipelagoNameDraft.trim());
                            setIsEditingArchipelagoName(false);
                          }
                        } else if (e.key === 'Escape') {
                          setIsEditingArchipelagoName(false);
                          setArchipelagoNameDraft(currentScope.name);
                        }
                      }}
                      className="w-full bg-white border-2 border-[#111827] px-2 py-1 text-base font-editorial font-bold rounded-[3px] text-[#111827] outline-none"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (archipelagoNameDraft.trim()) {
                            onRenameContinent?.(currentScope.name, archipelagoNameDraft.trim());
                            setIsEditingArchipelagoName(false);
                          }
                        }}
                        className="px-2.5 py-1 bg-[#111827] text-white rounded-[3px] text-xs font-sans font-medium flex items-center gap-1 hover:bg-[#20293a] cursor-pointer"
                      >
                        <Check className="w-3 h-3" /> Save Name
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingArchipelagoName(false);
                          setArchipelagoNameDraft(currentScope.name);
                        }}
                        className="px-2 py-1 bg-white border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] rounded-[3px] text-xs font-sans cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-editorial text-2xl font-bold text-[#111827] leading-tight truncate">
                      {currentScope.name}
                    </h2>
                    {isArchipelagoEditable && onRenameContinent && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingArchipelagoName(true);
                          setArchipelagoNameDraft(currentScope.name);
                        }}
                        className="flex items-center space-x-1 text-[11px] font-technical text-[#6B7280] hover:text-[#111827] hover:bg-white px-2 py-0.5 border border-transparent hover:border-[#E5E7EB] rounded-[3px] transition-colors shrink-0 cursor-pointer"
                        title="Rename this archipelago"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Rename</span>
                      </button>
                    )}
                  </div>
                )}

                <p className="font-technical text-[10.5px] text-[#716C64] uppercase tracking-wide mt-0.5">
                  Thematic Archipelago Landmass
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1 text-[#8C877F] hover:text-[#111827] hover:bg-white rounded-[4px] transition-colors shrink-0 cursor-pointer"
                title="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Map Actions */}
            <div className="space-y-1.5 mt-2.5">
              <button
                type="button"
                onClick={handleFlyCamera}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-[#111827] text-white rounded-[4px] text-xs font-sans hover:bg-[#20293a] transition-all shadow-xs cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-[#D9C01B]" />
                <span>Fly Camera to Archipelago on Map</span>
              </button>

              {isArchipelagoEditable && activeContinent?.isCustomShape && onResetContinentShape && (
                <button
                  type="button"
                  onClick={() => onResetContinentShape(currentScope.name)}
                  className="w-full flex items-center justify-center space-x-1 py-1 px-2 bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#4B5563] hover:text-[#111827] rounded-[4px] text-[11px] font-technical transition-colors cursor-pointer"
                  title="Reset custom dragged polygon points back to smooth auto-hull"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Boundary to Auto-Hull</span>
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1. Archipelago Quadrant Assignment Card */}
            <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-technical text-[11px] uppercase font-bold text-[#111827] tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" style={{ color: badgeBg }} />
                  Archipelago Quadrant
                </span>
                <span
                  className="px-2 py-0.5 text-[9.5px] font-technical uppercase font-bold text-white rounded-[2px] shadow-2xs"
                  style={{ backgroundColor: badgeBg }}
                >
                  {currentQuadrant} Quadrant
                </span>
              </div>

              <p className="font-sans text-[11px] text-[#4B5563] leading-relaxed">
                {currentQuadrant === 'Inner' && 'Inner Quadrant (Top Left): Mindset, worldview, inner development, somatics & consciousness.'}
                {currentQuadrant === 'Social' && 'Social Quadrant (Top Right): Relationships, community, governance, social cohesion & justice.'}
                {currentQuadrant === 'Cultural' && 'Cultural Quadrant (Bottom Left): Shared narratives, arts, traditions, heritage, lineages & philosophy.'}
                {currentQuadrant === 'Systems' && 'Systems Quadrant (Bottom Right): Infrastructure, finance, economics, policy, ecology, tech & institutions.'}
              </p>

              {/* Quadrant Selector Controls */}
              <div className="space-y-2 pt-1 border-t border-[#E5E7EB]/80">
                <div className="flex items-center justify-between text-[10.5px] font-technical">
                  <span className="font-bold text-[#111827]">Change Quadrant:</span>
                  <span className="text-[#8C877F]">Moves island & all {listEntities.length} entities</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {(['Inner', 'Social', 'Cultural', 'Systems'] as CategoryQuadrant[]).map((quad) => {
                    const isCurrent = quad === currentQuadrant;
                    const qColor = categoryColors[quad] || '#111827';
                    return (
                      <button
                        key={quad}
                        type="button"
                        onClick={() => handleQuadrantChange(quad)}
                        disabled={isCurrent}
                        className={`p-2 rounded-[3px] border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-white border-[#111827] ring-1 ring-[#111827] shadow-2xs font-semibold'
                            : 'bg-white hover:bg-[#FAF8F5] border-[#E5E7EB] hover:border-[#111827] text-[#4B5563]'
                        }`}
                        title={isCurrent ? `Currently belongs to ${quad} Quadrant` : `Change archipelago quadrant to ${quad}`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: qColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`block font-technical text-[10.5px] uppercase truncate ${isCurrent ? 'text-[#111827] font-bold' : 'text-[#374151]'}`}>
                            {quad}
                          </span>
                          <span className="block font-sans text-[9.5px] text-[#8C877F] truncate">
                            {quad === 'Inner' && 'Top Left'}
                            {quad === 'Social' && 'Top Right'}
                            {quad === 'Cultural' && 'Bottom Left'}
                            {quad === 'Systems' && 'Bottom Right'}
                          </span>
                        </div>
                        {isCurrent && (
                          <span className="text-emerald-700 text-xs shrink-0 font-bold">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {quadrantChangeFeedback && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-[3px] flex items-center space-x-1.5 text-emerald-800 text-[11px] font-technical animate-fade-in shadow-2xs">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{quadrantChangeFeedback}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Archipelago Description */}
            <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] space-y-2">
              <span className="font-technical text-[11px] uppercase font-bold text-[#111827] tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#5B21B6]" />
                Archipelago Description
              </span>

              {isArchipelagoEditable ? (
                <div className="space-y-2">
                  <textarea
                    value={archipelagoDescDraft}
                    onChange={(e) => {
                      setArchipelagoDescDraft(e.target.value);
                      setIsArchipelagoDescSaved(false);
                    }}
                    placeholder="Describe this archipelago's core theme, domain, and focus..."
                    rows={3}
                    className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] p-2 text-xs font-sans rounded-[4px] outline-none resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between">
                    {isArchipelagoDescSaved ? (
                      <span className="text-[11px] font-technical text-emerald-700 flex items-center gap-1 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Description saved
                      </span>
                    ) : (
                      <span className="text-[10px] font-technical text-[#8C877F]">
                        Saved with archipelago metadata
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateContinentDescription?.(currentScope.name, archipelagoDescDraft.trim());
                        setIsArchipelagoDescSaved(true);
                        setTimeout(() => setIsArchipelagoDescSaved(false), 3000);
                      }}
                      className="px-2.5 py-1 bg-[#111827] text-white rounded-[3px] text-xs font-sans font-medium hover:bg-[#20293a] transition-all cursor-pointer"
                    >
                      Save Description
                    </button>
                  </div>
                </div>
              ) : (
                <p className="font-sans text-xs text-[#4B5563] leading-relaxed italic">
                  {activeContinent?.description || 'No custom description set for this archipelago.'}
                </p>
              )}
            </div>

            {/* Archipelago Size & Free Shoreline Sizing (Edit Mode) */}
            {editMode && (
              <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-technical text-[11px] uppercase font-bold text-[#111827] tracking-wider flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-[#0284C7]" />
                    Archipelago Size & Shoreline
                  </span>
                  {activeContinent?.isCustomShape && (
                    <span className="text-[9.5px] font-technical uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-[2px]">
                      Custom Polygon
                    </span>
                  )}
                </div>

                <p className="font-sans text-[11px] text-[#4B5563] leading-normal">
                  Change the archipelago size freely, or pull vertices on the map. Margins and entity counts won't restrict your custom size.
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onScaleContinent?.(currentScope.name, 0.85)}
                    className="flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#111827] rounded-[3px] text-xs font-technical transition-colors cursor-pointer shadow-2xs"
                    title="Shrink archipelago border by 15%"
                  >
                    <Minimize2 className="w-3 h-3 text-[#0284C7]" />
                    <span>Shrink (-15%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onScaleContinent?.(currentScope.name, 1.15)}
                    className="flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#111827] rounded-[3px] text-xs font-technical transition-colors cursor-pointer shadow-2xs"
                    title="Expand archipelago border by 15%"
                  >
                    <Maximize2 className="w-3 h-3 text-[#0284C7]" />
                    <span>Expand (+15%)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onFitContinentTightly?.(currentScope.name)}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded-[3px] text-xs font-technical font-semibold transition-colors cursor-pointer shadow-2xs"
                  title="Remove excess padding and wrap boundary tightly around entities"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fit Shoreline Tightly Around Entities</span>
                </button>

                {activeContinent?.isCustomShape && onResetContinentShape && (
                  <button
                    type="button"
                    onClick={() => onResetContinentShape(currentScope.name)}
                    className="w-full flex items-center justify-center space-x-1 py-1 px-2 bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#4B5563] hover:text-[#111827] rounded-[3px] text-[11px] font-technical transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Boundary to Auto-Hull</span>
                  </button>
                )}
              </div>
            )}

            {/* Archipelago Name & Sub-title Positioning (Edit Mode) */}
            {editMode && (
              <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-technical text-[11px] uppercase font-bold text-[#111827] tracking-wider flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-[#5B21B6]" />
                    Archipelago Name & Sub-title Position
                  </span>
                </div>

                <p className="font-sans text-[11px] text-[#4B5563] leading-normal">
                  Drag the archipelago name or entity count freely anywhere on the canvas, or use these nudge controls.
                </p>

                {/* Name Positioning */}
                <div className="space-y-1.5 bg-white p-2 border border-[#E5E7EB] rounded-[3px]">
                  <div className="flex items-center justify-between text-[11px] font-technical">
                    <span className="font-bold text-[#111827]">Archipelago Name</span>
                    <span className="text-[#8C877F]">
                      dx: {activeContinent?.labelOffsetX || 0}px • dy: {activeContinent?.labelOffsetY || 0}px
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <div className="grid grid-cols-4 gap-1 flex-1">
                      <button
                        type="button"
                        onClick={() => onMoveContinentLabel?.(currentScope.name, -15, 0)}
                        className="py-1 px-1.5 bg-[#FAF8F5] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-mono rounded-[2px] cursor-pointer"
                        title="Nudge Left"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveContinentLabel?.(currentScope.name, 15, 0)}
                        className="py-1 px-1.5 bg-[#FAF8F5] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-mono rounded-[2px] cursor-pointer"
                        title="Nudge Right"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveContinentLabel?.(currentScope.name, 0, -15)}
                        className="py-1 px-1.5 bg-[#FAF8F5] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-mono rounded-[2px] cursor-pointer"
                        title="Nudge Up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveContinentLabel?.(currentScope.name, 0, 15)}
                        className="py-1 px-1.5 bg-[#FAF8F5] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-mono rounded-[2px] cursor-pointer"
                        title="Nudge Down"
                      >
                        ↓
                      </button>
                    </div>
                    {Boolean(activeContinent?.labelOffsetX || activeContinent?.labelOffsetY) && (
                      <button
                        type="button"
                        onClick={() => onMoveContinentLabel?.(currentScope.name, -(activeContinent?.labelOffsetX || 0), -(activeContinent?.labelOffsetY || 0))}
                        className="p-1 text-[#8C877F] hover:text-[#111827] text-[10px] font-technical underline cursor-pointer"
                        title="Reset Name Offset"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-label (Entity count) Positioning */}
                <div className="space-y-1.5 bg-white p-2 border border-[#E5E7EB] rounded-[3px]">
                  <div className="flex items-center justify-between text-[11px] font-technical">
                    <span className="font-bold text-[#111827]">Sub-title (N° of Entities)</span>
                    <span className="text-[#8C877F]">
                      dx: {activeContinent?.subLabelOffsetX || 0}px • dy: {activeContinent?.subLabelOffsetY || 0}px
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <div className="grid grid-cols-4 gap-1 flex-1">
                      <button
                        type="button"
                        onClick={() => onMoveContinentSubLabel?.(currentScope.name, -15, 0)}
                        className="py-1 px-1.5 bg-[#FAF8F5] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-mono rounded-[2px] cursor-pointer"
                        title="Nudge Sub-label Left"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveContinentSubLabel?.(currentScope.name, 15, 0)}
                        className="py-1 px-1.5 bg-[#FAF8F5] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-mono rounded-[2px] cursor-pointer"
                        title="Nudge Sub-label Right"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveContinentSubLabel?.(currentScope.name, 0, -15)}
                        className="py-1 px-1.5 bg-[#FAF8F5] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-mono rounded-[2px] cursor-pointer"
                        title="Nudge Sub-label Up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveContinentSubLabel?.(currentScope.name, 0, 15)}
                        className="py-1 px-1.5 bg-[#FAF8F5] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-mono rounded-[2px] cursor-pointer"
                        title="Nudge Sub-label Down"
                      >
                        ↓
                      </button>
                    </div>
                    {onResetContinentSubLabel && (
                      <button
                        type="button"
                        onClick={() => onResetContinentSubLabel(currentScope.name)}
                        className="p-1 text-[#8C877F] hover:text-[#111827] text-[10px] font-technical underline cursor-pointer"
                        title="Reset Sub-label Offset"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {onResetContinentLabel && (
                  <button
                    type="button"
                    onClick={() => onResetContinentLabel(currentScope.name)}
                    className="w-full flex items-center justify-center space-x-1 py-1 px-2 bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#4B5563] hover:text-[#111827] rounded-[3px] text-[11px] font-technical transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Both Name & Sub-title to Default</span>
                  </button>
                )}
              </div>
            )}

            {/* Archipelago Title & Sub-title Rotation (Edit Mode) */}
            {editMode && (
              <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-technical text-[11px] uppercase font-bold text-[#111827] tracking-wider flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-[#5B21B6]" />
                    Archipelago Title Rotation
                  </span>
                  <span className="text-[10px] font-technical px-1.5 py-0.5 rounded-[2px] bg-white border border-[#E5E7EB] text-[#111827] font-semibold">
                    {(activeContinent?.labelRotation || 0)}°
                  </span>
                </div>

                <p className="font-sans text-[11px] text-[#4B5563] leading-normal">
                  Rotate the archipelago title and sub-title freely to any angle (-180° to +180°), or drag the rotate handle directly on the map.
                </p>

                {/* Main Title Angle */}
                <div className="space-y-2 bg-white p-2.5 border border-[#E5E7EB] rounded-[3px]">
                  <div className="flex items-center justify-between text-[11px] font-technical">
                    <span className="font-bold text-[#111827]">Main Title Angle</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="-180"
                        max="180"
                        value={activeContinent?.labelRotation || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          onRotateContinentLabel?.(currentScope.name, val, false, isRotationLinked);
                        }}
                        className="w-14 text-right px-1.5 py-0.5 border border-[#E5E7EB] text-xs font-mono rounded-[2px]"
                      />
                      <span className="text-[#8C877F] font-mono">°</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-[#8C877F]">-180°</span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={activeContinent?.labelRotation || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onRotateContinentLabel?.(currentScope.name, val, false, isRotationLinked);
                      }}
                      className="flex-1 accent-[#5B21B6] cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-[#8C877F]">+180°</span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-5 gap-1 pt-0.5">
                    {[
                      { label: '-90°', val: -90 },
                      { label: '-45°', val: -45 },
                      { label: '0°', val: 0 },
                      { label: '+45°', val: 45 },
                      { label: '+90°', val: 90 },
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => onRotateContinentLabel?.(currentScope.name, p.val, false, isRotationLinked)}
                        className={`py-1 text-[10px] font-technical rounded-[2px] transition-all cursor-pointer border ${
                          (activeContinent?.labelRotation || 0) === p.val
                            ? 'bg-[#111827] text-white border-[#111827] font-bold shadow-2xs'
                            : 'bg-[#FAF8F5] hover:bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-title Angle */}
                <div className="space-y-2 bg-white p-2.5 border border-[#E5E7EB] rounded-[3px]">
                  <div className="flex items-center justify-between text-[11px] font-technical">
                    <span className="font-bold text-[#111827]">Sub-title Angle (Entity Count)</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="-180"
                        max="180"
                        value={activeContinent?.subLabelRotation !== undefined ? activeContinent.subLabelRotation : (activeContinent?.labelRotation || 0)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          onRotateContinentLabel?.(currentScope.name, val, true, isRotationLinked);
                        }}
                        className="w-14 text-right px-1.5 py-0.5 border border-[#E5E7EB] text-xs font-mono rounded-[2px]"
                      />
                      <span className="text-[#8C877F] font-mono">°</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-[#8C877F]">-180°</span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={activeContinent?.subLabelRotation !== undefined ? activeContinent.subLabelRotation : (activeContinent?.labelRotation || 0)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onRotateContinentLabel?.(currentScope.name, val, true, isRotationLinked);
                      }}
                      className="flex-1 accent-[#0284C7] cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-[#8C877F]">+180°</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1 pt-0.5">
                    {[
                      { label: '-90°', val: -90 },
                      { label: '-45°', val: -45 },
                      { label: '0°', val: 0 },
                      { label: '+45°', val: 45 },
                      { label: '+90°', val: 90 },
                    ].map(p => {
                      const currentSub = activeContinent?.subLabelRotation !== undefined ? activeContinent.subLabelRotation : (activeContinent?.labelRotation || 0);
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => onRotateContinentLabel?.(currentScope.name, p.val, true, isRotationLinked)}
                          className={`py-1 text-[10px] font-technical rounded-[2px] transition-all cursor-pointer border ${
                            currentSub === p.val
                              ? 'bg-[#111827] text-white border-[#111827] font-bold shadow-2xs'
                              : 'bg-[#FAF8F5] hover:bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Link Toggle & Reset */}
                <div className="space-y-2 pt-0.5">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRotationLinked}
                      onChange={(e) => setIsRotationLinked(e.target.checked)}
                      className="rounded text-[#5B21B6] focus:ring-[#5B21B6] cursor-pointer"
                    />
                    <span className="text-[11px] font-sans text-[#4B5563]">
                      Keep title & sub-title rotation synchronized
                    </span>
                  </label>

                  {onResetContinentRotation && (
                    <button
                      type="button"
                      onClick={() => onResetContinentRotation(currentScope.name)}
                      className="w-full flex items-center justify-center space-x-1 py-1 px-2 bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#4B5563] hover:text-[#111827] rounded-[3px] text-[11px] font-technical transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Rotation to 0°</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Archipelago Title & Sub-title Curvature (Edit Mode) */}
            {editMode && (
              <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-technical text-[11px] uppercase font-bold text-[#111827] tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                    Archipelago Title Curvature
                  </span>
                  <span className="text-[10px] font-technical px-1.5 py-0.5 rounded-[2px] bg-white border border-[#E5E7EB] text-[#111827] font-semibold">
                    {(activeContinent?.titleCurvature ?? 0.7) <= 0.04 ? 'Straight' : `${Math.round(((activeContinent?.titleCurvature ?? 0.7)) * 100)}% Arc`}
                  </span>
                </div>

                <p className="font-sans text-[11px] text-[#4B5563] leading-normal">
                  Change how curved or straight the title and sub-title bend over the archipelago. Titles are guaranteed to display in full without cropping, even on long names.
                </p>

                {/* Title Curvature Control */}
                <div className="space-y-2 bg-white p-2.5 border border-[#E5E7EB] rounded-[3px]">
                  <div className="flex items-center justify-between text-[11px] font-technical">
                    <span className="font-bold text-[#111827]">Main Title Arc</span>
                    <span className="text-[#8C877F] font-mono">
                      {(activeContinent?.titleCurvature ?? 0.7) <= 0.04 ? 'Straight (0%)' : `${Math.round(((activeContinent?.titleCurvature ?? 0.7)) * 100)}%`}
                    </span>
                  </div>

                  {/* Curvature Slider */}
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-technical text-[#8C877F]">Straight</span>
                    <input
                      type="range"
                      min="0"
                      max="1.2"
                      step="0.05"
                      value={activeContinent?.titleCurvature ?? 0.7}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onUpdateContinentCurvature?.(currentScope.name, val, isCurvatureLinked ? val : undefined);
                      }}
                      className="flex-1 accent-[#5B21B6] cursor-pointer"
                    />
                    <span className="text-[10px] font-technical text-[#8C877F]">Curved</span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[
                      { label: 'Straight', val: 0 },
                      { label: 'Gentle', val: 0.35 },
                      { label: 'Natural', val: 0.7 },
                      { label: 'Curved', val: 1.0 },
                    ].map(p => {
                      const isActive = Math.abs((activeContinent?.titleCurvature ?? 0.7) - p.val) < 0.08;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            onUpdateContinentCurvature?.(currentScope.name, p.val, isCurvatureLinked ? p.val : undefined);
                          }}
                          className={`py-1 px-1.5 text-[10px] font-technical rounded-[2px] transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-[#111827] text-white border-[#111827] font-bold shadow-2xs'
                              : 'bg-[#FAF8F5] hover:bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-title Curvature Control */}
                <div className="space-y-2 bg-white p-2.5 border border-[#E5E7EB] rounded-[3px]">
                  <div className="flex items-center justify-between text-[11px] font-technical">
                    <span className="font-bold text-[#111827]">Sub-title Arc (Entities Count)</span>
                    <span className="text-[#8C877F] font-mono">
                      {(activeContinent?.subTitleCurvature ?? 0.7) <= 0.04 ? 'Straight (0%)' : `${Math.round(((activeContinent?.subTitleCurvature ?? 0.7)) * 100)}%`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-technical text-[#8C877F]">Straight</span>
                    <input
                      type="range"
                      min="0"
                      max="1.2"
                      step="0.05"
                      value={activeContinent?.subTitleCurvature ?? 0.7}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onUpdateContinentCurvature?.(currentScope.name, isCurvatureLinked ? val : undefined, val);
                      }}
                      className="flex-1 accent-[#0284C7] cursor-pointer"
                    />
                    <span className="text-[10px] font-technical text-[#8C877F]">Curved</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[
                      { label: 'Straight', val: 0 },
                      { label: 'Gentle', val: 0.35 },
                      { label: 'Concentric', val: 0.7 },
                      { label: 'Curved', val: 1.0 },
                    ].map(p => {
                      const isActive = Math.abs((activeContinent?.subTitleCurvature ?? 0.7) - p.val) < 0.08;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            onUpdateContinentCurvature?.(currentScope.name, isCurvatureLinked ? p.val : undefined, p.val);
                          }}
                          className={`py-1 px-1.5 text-[10px] font-technical rounded-[2px] transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-[#111827] text-white border-[#111827] font-bold shadow-2xs'
                              : 'bg-[#FAF8F5] hover:bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Link Toggle & Global Actions */}
                <div className="space-y-2 pt-0.5">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isCurvatureLinked}
                      onChange={(e) => setIsCurvatureLinked(e.target.checked)}
                      className="rounded text-[#5B21B6] focus:ring-[#5B21B6] cursor-pointer"
                    />
                    <span className="text-[11px] font-sans text-[#4B5563]">
                      Keep title & sub-title curvature synchronized
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5 pt-1">
                    {onUpdateAllContinentsCurvature && (
                      <button
                        type="button"
                        onClick={() => {
                          const currentTitle = activeContinent?.titleCurvature ?? 0.7;
                          const currentSub = activeContinent?.subTitleCurvature ?? 0.7;
                          onUpdateAllContinentsCurvature(currentTitle, currentSub);
                          setCurvatureFeedback('Applied curvature to all archipelagos!');
                          setTimeout(() => setCurvatureFeedback(null), 3000);
                        }}
                        className="flex-1 py-1.5 px-2 bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#111827] rounded-[3px] text-xs font-technical transition-colors cursor-pointer shadow-2xs flex items-center justify-center space-x-1"
                        title="Apply this archipelago's curvature to every archipelago across the whole map"
                      >
                        <Globe className="w-3 h-3 text-[#5B21B6]" />
                        <span>Apply to All Archipelagos</span>
                      </button>
                    )}

                    {onResetContinentCurvature && (
                      <button
                        type="button"
                        onClick={() => onResetContinentCurvature(currentScope.name)}
                        className="py-1.5 px-2 bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#4B5563] hover:text-[#111827] rounded-[3px] text-xs font-technical transition-colors cursor-pointer"
                        title="Reset curvature for this archipelago back to default"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {curvatureFeedback && (
                    <div className="p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[3px] text-[10.5px] font-technical text-center animate-in fade-in">
                      {curvatureFeedback}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map Snapshots & Quadrant Sizes (Edit Mode) */}
            {editMode && (
              <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-technical text-[11px] uppercase font-bold text-[#111827] tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
                    Map Snapshots & Layout
                  </span>
                </div>

                <p className="font-sans text-[11px] text-[#4B5563] leading-normal">
                  Export or restore snapshots of map coordinates and adjust quadrant dimensions.
                </p>

                {/* 1. Snapshots button */}
                {onOpenPositionSnapshotModal && (
                  <button
                    type="button"
                    onClick={onOpenPositionSnapshotModal}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-white border border-[#BFDBFE] hover:border-[#2563EB] hover:bg-[#EFF6FF] text-[#1D4ED8] rounded-[4px] text-xs font-technical font-semibold transition-all cursor-pointer shadow-2xs"
                    title="Export or Import positions snapshot JSON"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Positions Snapshot (Export / Import JSON)</span>
                  </button>
                )}

                {/* 2. Quadrant Sizes below Snapshots (only opens when clicked) */}
                {onUpdateQuadrantSizes && (
                  <div className="space-y-2 pt-1 border-t border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={() => setIsSidebarQuadrantOpen(prev => !prev)}
                      className={`w-full flex items-center justify-between py-2 px-3 rounded-[4px] text-xs font-technical font-semibold transition-all cursor-pointer border ${
                        isSidebarQuadrantOpen
                          ? 'bg-[#111827] text-[#D9C01B] border-[#111827] shadow-xs'
                          : 'bg-white hover:bg-[#FAF8F5] text-[#111827] border-[#E5E7EB] hover:border-[#111827]'
                      }`}
                      title="Adjust quadrant sizes across layers"
                    >
                      <div className="flex items-center space-x-2">
                        <Maximize2 className="w-3.5 h-3.5 text-[#D9C01B]" />
                        <span>Quadrant Sizes (Layer {activeLayer})</span>
                      </div>
                      <span className="text-xs">
                        {isSidebarQuadrantOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    </button>

                    {/* Expandable quadrant sizing controls */}
                    {isSidebarQuadrantOpen && (
                      <div className="p-2.5 bg-white border border-[#E5E7EB] rounded-[4px] space-y-2.5 animate-in fade-in duration-150">
                        {/* Layer selection */}
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { id: 1 as const, label: 'L1' },
                            { id: 2 as const, label: 'L2' },
                            { id: 3 as const, label: 'L3' },
                            { id: 'all' as const, label: 'All' }
                          ].map(tab => (
                            <button
                              key={String(tab.id)}
                              type="button"
                              onClick={() => onSelectLayer?.(tab.id)}
                              className={`py-1 text-[10px] font-technical uppercase font-bold rounded-[2px] transition-all cursor-pointer border ${
                                activeLayer === tab.id
                                  ? 'bg-[#111827] text-[#D9C01B] border-[#111827]'
                                  : 'bg-[#FAF8F5] hover:bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Quick Presets */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-technical uppercase text-[#8C877F] block">Quick Presets:</span>
                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { label: '750px', size: 750 },
                              { label: 'Default', size: activeLayer === 1 ? 950 : (activeLayer === 2 ? 1400 : 1600) },
                              { label: '1250px', size: 1250 },
                              { label: '1600px', size: 1600 }
                            ].map(p => (
                              <button
                                key={p.label}
                                type="button"
                                onClick={() => {
                                  onUpdateQuadrantSizes?.({
                                    Inner: { width: p.size, height: p.size },
                                    Social: { width: p.size, height: p.size },
                                    Cultural: { width: p.size, height: p.size },
                                    Systems: { width: p.size, height: p.size }
                                  }, activeLayer);
                                }}
                                className={`py-1 text-[10px] font-technical rounded-[2px] cursor-pointer border ${
                                  (activeQuadrantSizes?.Inner?.width === p.size)
                                    ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold'
                                    : 'bg-[#FAF8F5] hover:bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Uniform slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-technical">
                            <span className="font-bold text-[#111827]">Uniform Size:</span>
                            <span className="font-mono text-[#5B21B6] font-bold">
                              {activeQuadrantSizes?.Inner?.width || 950} px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="500"
                            max="2500"
                            step="25"
                            value={activeQuadrantSizes?.Inner?.width || 950}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              onUpdateQuadrantSizes?.({
                                Inner: { width: val, height: val },
                                Social: { width: val, height: val },
                                Cultural: { width: val, height: val },
                                Systems: { width: val, height: val }
                              }, activeLayer);
                            }}
                            className="w-full accent-[#5B21B6] cursor-pointer"
                          />
                        </div>

                        {/* Actions: Auto-Fit & Reset */}
                        <div className="flex items-center gap-1.5 pt-1">
                          {onAutoFitQuadrantSizes && (
                            <button
                              type="button"
                              onClick={() => onAutoFitQuadrantSizes(activeLayer)}
                              className="flex-1 py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-technical text-[10.5px] font-semibold rounded-[3px] transition-colors cursor-pointer flex items-center justify-center space-x-1"
                              title="Auto-fit quadrant boundaries around initiatives"
                            >
                              <Wand2 className="w-3 h-3 text-emerald-600" />
                              <span>Auto-Fit</span>
                            </button>
                          )}
                          {onResetQuadrantSizes && (
                            <button
                              type="button"
                              onClick={() => onResetQuadrantSizes(activeLayer)}
                              className="py-1 px-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 font-technical text-[10.5px] rounded-[3px] transition-colors cursor-pointer"
                              title="Reset quadrant dimensions to default"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Entities Belonging to this Archipelago */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between font-technical text-[11px] text-[#8C877F] uppercase tracking-wider px-0.5">
                <span className="font-bold text-[#111827]">
                  Archipelago Entities ({listEntities.length})
                </span>
                <span>{isArchipelagoEditable ? 'Edit Membership' : 'Click to inspect'}</span>
              </div>

              {/* Add Entity Search & Dropdown (Edit Mode Only) */}
              {isArchipelagoEditable && (
                <div ref={addEntityContainerRef} className="relative">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Add an entity to this archipelago..."
                      value={archipelagoAddSearch}
                      onFocus={() => setShowAddEntityDropdown(true)}
                      onChange={(e) => {
                        setArchipelagoAddSearch(e.target.value);
                        setShowAddEntityDropdown(true);
                      }}
                      className="w-full bg-white border border-[#D1D5DB] focus:border-[#111827] pl-8 pr-7 py-1.5 text-xs font-sans rounded-[4px] outline-none shadow-2xs placeholder-[#9CA3AF]"
                    />
                    {archipelagoAddSearch && (
                      <button
                        type="button"
                        onClick={() => setArchipelagoAddSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown with candidate entities */}
                  {showAddEntityDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-[4px] shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-[#F3F4F6]">
                      <div className="p-2 bg-[#FAF8F5] text-[10px] font-technical uppercase text-[#6B7280] font-semibold flex items-center justify-between">
                        <span>Select entity to assign ({candidatesToAdd.length} found)</span>
                        <button
                          type="button"
                          onClick={() => setShowAddEntityDropdown(false)}
                          className="hover:text-[#111827] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {candidatesToAdd.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[#8C877F] font-sans">
                          {archipelagoAddSearch.trim()
                            ? 'No entities match your search.'
                            : 'All entities are already assigned to this archipelago.'}
                        </div>
                      ) : (
                        candidatesToAdd.map((cand, candIdx) => {
                          const candIcon = cand.type === 'Person' ? '🧙' : cand.type === 'Idea' ? '🔮' : cand.type === 'Media' ? '🎙️' : '🕸️';
                          return (
                            <div
                              key={cand.id || `cand-${candIdx}`}
                              className="p-2 hover:bg-[#FAF8F5] flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-xs shrink-0 select-none">{candIcon}</span>
                                  <span className="font-semibold text-[#111827] truncate font-sans">
                                    {cand.name}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-[10px] text-[#6B7280] font-technical mt-0.5">
                                  <span>{cand.category} Quadrant</span>
                                  {cand.continent && <span>• Current: {cand.continent}</span>}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onAddEntityToContinent) {
                                    onAddEntityToContinent(currentScope.name, cand.id);
                                    setArchipelagoAddSearch('');
                                    setShowAddEntityDropdown(false);
                                  }
                                }}
                                className="px-2 py-1 bg-[#111827] hover:bg-[#374151] text-white text-[11px] font-sans font-medium rounded-[3px] flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add</span>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Filter Current Member Entities */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter entities in this archipelago..."
                  value={snapshotSearch}
                  onChange={(e) => setSnapshotSearch(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] pl-8 pr-3 py-1.5 text-xs font-sans rounded-[4px] outline-none"
                />
              </div>

              {/* Member Entities List */}
              {filteredEntities.length === 0 ? (
                <div className="p-8 text-center bg-[#FAF8F5] border border-dashed border-[#E5E7EB] rounded-[4px]">
                  <p className="font-sans text-xs text-[#8C877F] leading-relaxed">
                    {listEntities.length === 0
                      ? 'No entities are currently assigned to this archipelago. Use the search bar above to assign entities.'
                      : 'No entities in this archipelago match your filter.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredEntities.map((ent, entIdx) => {
                    const typeIcon = ent.type === 'Person' ? '🧙' : ent.type === 'Idea' ? '🔮' : ent.type === 'Media' ? '🎙️' : '🕸️';
                    const entCatColor = categoryColors[ent.category] || '#111827';
                    const dc = getEntityCompleteness(ent);
                    const dcConfig = getCompletenessConfig(dc);

                    return (
                      <div
                        key={ent.id || `ent-${entIdx}`}
                        onClick={() => {
                          const selection = window.getSelection();
                          if (selection && selection.toString().trim().length > 0) return;
                          onSelectEntity(ent);
                        }}
                        className="p-3 bg-white hover:bg-[#FAF8F5] border border-[#E5E7EB] hover:border-[#111827] rounded-[4px] shadow-xs cursor-pointer transition-all group select-text"
                      >
                        {/* Header: Icon, Name, Indicators */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center space-x-2 truncate">
                            <span className="text-sm shrink-0 select-none">{typeIcon}</span>
                            <h4 className="font-editorial text-sm font-bold text-[#111827] truncate group-hover:text-[#5B21B6] transition-colors select-text">
                              {ent.name}
                            </h4>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0 select-none">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border border-white"
                              style={{
                                backgroundColor: dcConfig.dotBg,
                                border: `1.5px solid ${dcConfig.dotBorder}`
                              }}
                              title={`Data Completeness: ${dc}`}
                            />
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: entCatColor }}
                              title={`${ent.category} Quadrant`}
                            />
                            {isEntityPrimaryToArchipelago(ent, currentScope.name) ? (
                              <span className="text-[9px] font-technical uppercase px-1.5 py-0.5 bg-[#FAF8F5] border border-[#E5E7EB] text-[#8C877F] rounded-[2px]">
                                {ent.type}
                              </span>
                            ) : (
                              <span
                                className="text-[9px] font-technical uppercase px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 font-semibold rounded-[2px]"
                                title={`Affiliated with this archipelago via Other Archipelagos (Primary: ${ent.continent || 'None'})`}
                              >
                                ★ Affiliated
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description Preview */}
                        {ent.description && (
                          <p className="font-sans text-xs text-[#4B5563] line-clamp-2 leading-relaxed mb-2 select-text">
                            {ent.description}
                          </p>
                        )}

                        {/* Tags Pill Row */}
                        {ent.fields.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mb-2">
                            {ent.fields.slice(0, 3).map(f => (
                              <span
                                key={f}
                                className="px-1.5 py-0.5 bg-[#FAF8F5] border border-[#E5E7EB] text-[#4B5563] font-sans text-[10px] rounded-[2px]"
                              >
                                {f}
                              </span>
                            ))}
                            {ent.fields.length > 3 && (
                              <span className="text-[10px] font-technical text-[#8C877F] px-1 py-0.5">
                                +{ent.fields.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Bottom Actions Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6] text-[10px] font-sans">
                          <div className="flex items-center space-x-2 text-[#8C877F] truncate pr-2">
                            {ent.location && (
                              <span className="flex items-center space-x-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{ent.location}</span>
                              </span>
                            )}
                            {ent.stage && (
                              <span className="font-technical uppercase font-medium text-[#111827]">
                                • {ent.stage}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {onCenterEntity && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCenterEntity(ent);
                                }}
                                title={`Locate ${ent.name} on map`}
                                className="p-1 text-[#8C877F] hover:text-[#111827] hover:bg-white rounded-[2px] transition-colors cursor-pointer"
                              >
                                <Compass className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Remove from Archipelago Button (Edit Mode Only) */}
                            {isArchipelagoEditable && onRemoveEntityFromContinent && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveEntityFromContinent(currentScope.name, ent.id);
                                }}
                                title={`Remove ${ent.name} from ${currentScope.name}`}
                                className="px-2 py-0.5 text-[10px] font-technical font-medium text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-[2px] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectEntity(ent);
                              }}
                              className="font-technical text-[10px] text-[#111827] font-semibold underline hover:text-[#5B21B6] ml-1 cursor-pointer"
                            >
                              Details →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>
      );
    }

    let listEntities: EcosystemEntity[] = [];
    let title = '';
    let badgeText = '';
    let badgeBg = '#111827';
    let subtitle = '';
    let flyButtonLabel = '';
    let onFlyAction: (() => void) | undefined = undefined;

    if (currentScope.type === 'category') {
      const allCategoryEntities = allEntities.filter(e => e.category === currentScope.category);
      const catOrgCount = allCategoryEntities.filter(e => e.type === 'Organization').length;
      const catPersonCount = allCategoryEntities.filter(e => e.type === 'Person').length;
      const catIdeaCount = allCategoryEntities.filter(e => e.type === 'Idea').length;

      listEntities = currentScope.entityType
        ? allCategoryEntities.filter(e => e.type === currentScope.entityType)
        : allCategoryEntities;

      badgeBg = categoryColors[currentScope.category] || '#111827';
      badgeText = currentScope.entityType 
        ? `${currentScope.category} • ${currentScope.entityType === 'Person' ? 'People' : currentScope.entityType + 's'}`
        : `${currentScope.category} Quadrant`;
      title = currentScope.entityType 
        ? `${currentScope.category} Change: ${currentScope.entityType === 'Person' ? 'People' : currentScope.entityType + 's'}`
        : `${currentScope.category} Change`;
      subtitle = currentScope.category === 'Inner' 
        ? 'Upper Left • Self, Mind & Contemplation'
        : currentScope.category === 'Social'
        ? 'Upper Right • Civic Action & Commons'
        : currentScope.category === 'Cultural'
        ? 'Bottom Left • Mythos, Narrative & Ecology'
        : 'Bottom Right • Ecosystems & Infrastructure';
      if (onFlyToQuadrant) {
        flyButtonLabel = `Fly Camera to ${currentScope.category} Quadrant`;
        onFlyAction = () => onFlyToQuadrant(currentScope.category);
      }
    } else if (currentScope.type === 'entityType') {
      listEntities = currentScope.entityType === 'All'
        ? allEntities
        : allEntities.filter(e => e.type === currentScope.entityType);
      
      badgeBg = currentScope.entityType === 'Organization'
        ? '#4D5734'
        : currentScope.entityType === 'Person'
        ? '#0369A1'
        : currentScope.entityType === 'Idea'
        ? '#5B21B6'
        : '#111827';
      badgeText = currentScope.entityType === 'All' ? 'Complete Directory' : `${currentScope.entityType}s`;
      title = currentScope.entityType === 'Organization'
        ? 'Organizations'
        : currentScope.entityType === 'Person'
        ? 'People & Fellows'
        : currentScope.entityType === 'Idea'
        ? 'Ideas & Cornerstones'
        : 'All Ecosystem Entities';
      subtitle = 'Metta Ecosystem Cartography';
    } else if (currentScope.type === 'tag') {
      const tagLower = currentScope.tag.toLowerCase().trim();
      listEntities = allEntities.filter(e => 
        e.fields.some(f => f.toLowerCase().trim() === tagLower)
      );
      const cat = currentScope.category || listEntities[0]?.category || 'Systems';
      badgeBg = categoryColors[cat] || '#7D8764';
      badgeText = `Tag • ${cat}`;
      title = currentScope.tag;
      subtitle = 'Topic & Keyword Tag';
      if (onFlyToTag) {
        flyButtonLabel = `Move Camera to "${currentScope.tag}" on Map`;
        onFlyAction = () => onFlyToTag(currentScope.tag, currentScope.category);
      }
    } else if (currentScope.type === 'approach') {
      const appLower = currentScope.approach.toLowerCase().trim();
      listEntities = allEntities.filter(e => 
        (e.approach || []).some(a => a.toLowerCase().trim() === appLower) ||
        e.fields.some(f => f.toLowerCase().trim() === appLower)
      );
      const cat = currentScope.category || listEntities[0]?.category || 'Systems';
      badgeBg = '#0284C7';
      badgeText = `Approach • ${cat}`;
      title = currentScope.approach;
      subtitle = 'Methodology & Strategic Approach';
    } else if (currentScope.type === 'issues') {
      const issLower = currentScope.issue.toLowerCase().trim();
      listEntities = allEntities.filter(e => 
        (e.issues || []).some(i => i.toLowerCase().trim() === issLower) ||
        e.fields.some(f => f.toLowerCase().trim() === issLower)
      );
      const cat = currentScope.category || listEntities[0]?.category || 'Social';
      badgeBg = '#AD2831';
      badgeText = `Issue • ${cat}`;
      title = currentScope.issue;
      subtitle = 'Core Issue & Challenge Focus';
    } else if (currentScope.type === 'activities') {
      const actLower = currentScope.activity.toLowerCase().trim();
      listEntities = allEntities.filter(e => 
        (e.activities || []).some(a => a.toLowerCase().trim() === actLower) ||
        e.fields.some(f => f.toLowerCase().trim() === actLower)
      );
      const cat = currentScope.category || listEntities[0]?.category || 'Cultural';
      badgeBg = '#7D8764';
      badgeText = `Activity • ${cat}`;
      title = currentScope.activity;
      subtitle = 'Ecosystem Activities & Interventions';
    } else if (currentScope.type === 'relationship') {
      const allRelEntities = allEntities.filter(e => entityMatchesRelationship(e, currentScope.relationship));
      listEntities = currentScope.entityType
        ? allRelEntities.filter(e => e.type === currentScope.entityType)
        : allRelEntities;

      badgeBg = '#15803D';
      badgeText = currentScope.entityType
        ? `Relationship • ${currentScope.entityType === 'Person' ? 'People' : currentScope.entityType + 's'}`
        : 'Our Relationship';
      title = currentScope.relationship;
      subtitle = 'Ecosystem Relationship Filter';
    }

    const filteredEntities = ensureUniqueEntityIds(
      listEntities.filter(e => {
        if (!snapshotSearch.trim()) return true;
        const q = snapshotSearch.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          e.fields.some(f => f.toLowerCase().includes(q)) ||
          (e.approach && e.approach.some(a => a.toLowerCase().includes(q))) ||
          (e.issues && e.issues.some(i => i.toLowerCase().includes(q))) ||
          (e.activities && e.activities.some(a => a.toLowerCase().includes(q))) ||
          (e.location && e.location.toLowerCase().includes(q)) ||
          (e.type && e.type.toLowerCase().includes(q)) ||
          (e.stage && e.stage.toLowerCase().includes(q))
        );
      })
    );

    return (
      <aside className="w-96 bg-white border-l border-[#E5E7EB] flex flex-col h-full z-30 shadow-lg relative select-text">
        {/* Top Header */}
        <div className="p-4 border-b border-[#E5E7EB] bg-[#FAF8F5]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span
                  className="px-2 py-0.5 text-[10px] font-technical uppercase font-semibold text-white rounded-[2px]"
                  style={{ backgroundColor: badgeBg }}
                >
                  {badgeText}
                </span>
                <span className="font-technical text-[10px] text-[#8C877F] uppercase">
                  {listEntities.length} {listEntities.length === 1 ? 'Entity' : 'Entities'}
                </span>
              </div>
              <h2 className="font-editorial text-2xl font-bold text-[#111827] leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="font-technical text-[10.5px] text-[#716C64] uppercase tracking-wide mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1 text-[#8C877F] hover:text-[#111827] hover:bg-white rounded-[4px] transition-colors shrink-0 cursor-pointer"
              title="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

            {/* Quick Actions & Search inside List Scope */}
            <div className="space-y-2 mt-3">
              {/* Category & Relationship Quick Type Filter Chips */}
              {(currentScope.type === 'category' || currentScope.type === 'relationship') && (() => {
                const allScopeEntities = currentScope.type === 'category'
                  ? allEntities.filter(e => e.category === currentScope.category)
                  : allEntities.filter(e => entityMatchesRelationship(e, currentScope.relationship));
                const catOrgCount = allScopeEntities.filter(e => e.type === 'Organization').length;
                const catPersonCount = allScopeEntities.filter(e => e.type === 'Person').length;
                const catIdeaCount = allScopeEntities.filter(e => e.type === 'Idea').length;

                const handleTypeSelect = (entType?: EntityType) => {
                  if (currentScope.type === 'category') {
                    onSelectCategoryList?.(currentScope.category, entType);
                  } else if (currentScope.type === 'relationship') {
                    onSelectRelationshipList?.(currentScope.relationship, entType);
                  }
                };

                const activeBtnBg = currentScope.type === 'relationship' ? '#15803D' : '#111827';

                return (
                  <div className="flex items-center space-x-1 font-technical text-[10px] overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      onClick={() => handleTypeSelect(undefined)}
                      className={`px-2 py-1 rounded-[3px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        !currentScope.entityType
                          ? 'text-white shadow-2xs'
                          : 'bg-white border border-[#E5E7EB] text-[#4B5563] hover:border-[#111827] hover:text-[#111827]'
                      }`}
                      style={!currentScope.entityType ? { backgroundColor: activeBtnBg } : undefined}
                    >
                      All ({allScopeEntities.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeSelect(currentScope.entityType === 'Organization' ? undefined : 'Organization')}
                      className={`px-2 py-1 rounded-[3px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        currentScope.entityType === 'Organization'
                          ? 'bg-[#4D5734] text-white shadow-2xs'
                          : 'bg-white border border-[#E5E7EB] text-[#4B5563] hover:border-[#111827] hover:text-[#111827]'
                      }`}
                    >
                      🕸️ Orgs ({catOrgCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeSelect(currentScope.entityType === 'Person' ? undefined : 'Person')}
                      className={`px-2 py-1 rounded-[3px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        currentScope.entityType === 'Person'
                          ? 'bg-[#0369A1] text-white shadow-2xs'
                          : 'bg-white border border-[#E5E7EB] text-[#4B5563] hover:border-[#111827] hover:text-[#111827]'
                      }`}
                    >
                      🧙 People ({catPersonCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeSelect(currentScope.entityType === 'Idea' ? undefined : 'Idea')}
                      className={`px-2 py-1 rounded-[3px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        currentScope.entityType === 'Idea'
                          ? 'bg-[#5B21B6] text-white shadow-2xs'
                          : 'bg-white border border-[#E5E7EB] text-[#4B5563] hover:border-[#111827] hover:text-[#111827]'
                      }`}
                    >
                      🔮 Ideas ({catIdeaCount})
                    </button>
                  </div>
                );
              })()}

              {onFlyAction && flyButtonLabel && (
                <button
                  onClick={onFlyAction}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-[#111827] text-white rounded-[4px] text-xs font-sans hover:bg-[#20293a] transition-all shadow-xs cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#D9C01B]" />
                  <span>{flyButtonLabel}</span>
                </button>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter entities in this view..."
                  value={snapshotSearch}
                  onChange={(e) => setSnapshotSearch(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] pl-8 pr-3 py-1.5 text-xs font-sans rounded-[4px] outline-none"
                />
              </div>
            </div>
        </div>

        {/* Snapshot Entity List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between font-technical text-[11px] text-[#8C877F] uppercase tracking-wider px-0.5">
            <span>Entity Snapshots ({filteredEntities.length})</span>
            <span>Click card to inspect</span>
          </div>

          {filteredEntities.length === 0 ? (
            <div className="p-8 text-center bg-[#FAF8F5] border border-dashed border-[#E5E7EB] rounded-[4px]">
              <p className="font-sans text-xs text-[#8C877F]">
                No entities match your search filter in this collection.
              </p>
            </div>
          ) : (
            filteredEntities.map((ent, entIdx) => {
              const typeIcon = ent.type === 'Person' ? '🧙' : ent.type === 'Idea' ? '🔮' : ent.type === 'Media' ? '🎙️' : '🕸️';
              const entCatColor = categoryColors[ent.category] || '#111827';
              const dc = getEntityCompleteness(ent);
              const dcConfig = getCompletenessConfig(dc);
              const dqDotBg = dcConfig.dotBg;
              const dqDotBorder = dcConfig.dotBorder;

              return (
                <div
                  key={ent.id || `scope-ent-${entIdx}`}
                  onClick={() => {
                    const selection = window.getSelection();
                    if (selection && selection.toString().trim().length > 0) return;
                    onSelectEntity(ent);
                  }}
                  className="p-3 bg-white hover:bg-[#FAF8F5] border border-[#E5E7EB] hover:border-[#111827] rounded-[4px] shadow-xs cursor-pointer transition-all group select-text"
                >
                  {/* Top line: Icon + Name + Type + Quadrant */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-sm shrink-0 select-none">{typeIcon}</span>
                      <h4 className="font-editorial text-sm font-bold text-[#111827] truncate group-hover:text-[#5B21B6] transition-colors select-text">
                        {ent.name}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 select-none">
                      {/* Data Completeness Dot indicator */}
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border border-white"
                        style={{
                          backgroundColor: dqDotBg,
                          border: `1.5px solid ${dqDotBorder}`
                        }}
                        title={`Data Completeness: ${dc} (${dcConfig.description})`}
                      />
                      <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: entCatColor }}
                        title={`${ent.category} Quadrant`}
                      />
                      <span className="text-[9px] font-technical uppercase px-1.5 py-0.5 bg-[#FAF8F5] border border-[#E5E7EB] text-[#8C877F] rounded-[2px]">
                        {ent.type}
                      </span>
                    </div>
                  </div>

                  {/* Description Snapshot Preview */}
                  {ent.description && (
                    <p className="font-sans text-xs text-[#4B5563] line-clamp-2 leading-relaxed mb-2 select-text">
                      {ent.description}
                    </p>
                  )}

                  {/* Tags Pill Row */}
                  {ent.fields.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mb-2">
                      {ent.fields.slice(0, 3).map(f => (
                        <span
                          key={f}
                          onClick={(e) => {
                            const selection = window.getSelection();
                            if (selection && selection.toString().trim().length > 0) return;
                            if (!editMode && onSelectTagList) {
                              e.stopPropagation();
                              onSelectTagList(f, ent.category);
                            }
                          }}
                          className="px-1.5 py-0.5 bg-[#FAF8F5] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-sans text-[10px] rounded-[2px] transition-colors select-text"
                        >
                          {f}
                        </span>
                      ))}
                      {ent.fields.length > 3 && (
                        <div className="relative group/moretip inline-flex items-center">
                          <span 
                            className="text-[10px] font-technical text-[#8C877F] hover:text-[#111827] px-1 py-0.5 rounded-[2px] bg-[#FAF8F5] border border-[#E5E7EB] cursor-pointer"
                            title={ent.fields.slice(3).join(', ')}
                          >
                            +{ent.fields.length - 3} more
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/moretip:flex flex-col items-center z-50 pointer-events-none">
                            <div className="bg-[#111827] text-white text-[9px] font-sans py-1.5 px-2 rounded-[4px] shadow-xl border border-[#374151] whitespace-nowrap min-w-[100px] max-w-[200px] text-left">
                              <div className="font-technical text-[7.5px] text-[#9CA3AF] uppercase mb-1 tracking-wider font-semibold border-b border-white/10 pb-0.5 flex items-center justify-between gap-2">
                                <span>Remaining Tags</span>
                                <span className="text-[#D9C01B]">+{ent.fields.length - 3}</span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                {ent.fields.slice(3).map((tag, idx) => (
                                  <span key={idx} className="text-white/90 text-[8.5px] font-medium truncate">
                                    • {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="w-1.5 h-1.5 bg-[#111827] border-r border-b border-[#374151] transform rotate-45 -mt-1"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bottom Metadata & Action buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6] text-[10px] font-sans">
                    <div className="flex items-center space-x-2 text-[#8C877F] truncate pr-2">
                      {ent.location && (
                        <span className="flex items-center space-x-0.5 truncate">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{ent.location}</span>
                        </span>
                      )}
                      {ent.stage && (
                        <span className="font-technical uppercase font-medium text-[#111827]">
                          • {ent.stage}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCenterEntity(ent);
                        }}
                        title={`Locate ${ent.name} on map`}
                        className="p-1 text-[#8C877F] hover:text-[#111827] hover:bg-white rounded-[2px] transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEntity(ent);
                        }}
                        className="font-technical text-[10px] text-[#111827] font-semibold underline hover:text-[#5B21B6]"
                      >
                        Details →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    );
  }

  if (!entity || !modalEntity) return null;

  const entContinent = entity.continent ? formatClusterWithNumber(entity.continent) : '';

  // Field change handlers for Edit Mode
  const handleFieldChange = (key: keyof EcosystemEntity, value: any) => {
    onUpdateEntity({
      ...entity,
      [key]: value
    });
  };

  const handleAutoSuggestContinent = () => {
    const suggested = suggestContinent(entity);
    handleFieldChange('continent', suggested);
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !entity.fields.includes(trimmed)) {
      onUpdateEntity({
        ...entity,
        fields: [...entity.fields, trimmed]
      });
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateEntity({
      ...entity,
      fields: entity.fields.filter(f => f !== tagToRemove)
    });
  };

  const handleOtherArchipelagosChange = (valStr: string) => {
    const parsedArchs = valStr.split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
    const nonArchFields = filterProfileTags(entity.fields || [], entity);
    const updatedCategorized = {
      ...(entity.categorizedFields || {}),
      Overview: {
        ...((entity.categorizedFields && entity.categorizedFields['Overview']) || {}),
        'Other Archipelagos': valStr
      }
    };
    const updatedExtra = {
      ...(entity.extraFields || {}),
      'Other Archipelagos': valStr,
      'Island/Cluster': valStr
    };
    onUpdateEntity({
      ...entity,
      otherArchipelagos: parsedArchs,
      fields: Array.from(new Set([...nonArchFields, ...parsedArchs])).filter(Boolean),
      categorizedFields: updatedCategorized,
      extraFields: updatedExtra
    });
  };

  // Active entity displayed in enlarged focus modal (either draft during contribution or current entity)
  const isModalEditMode = editMode || isContributing;
  const modalEntContinent = modalEntity.continent ? formatClusterWithNumber(modalEntity.continent) : '';

  const handleModalFieldChange = (key: keyof EcosystemEntity, value: any) => {
    if (isContributing) {
      setDraftEntity(prev => prev ? ({ ...prev, [key]: value }) : null);
    } else {
      handleFieldChange(key, value);
    }
  };

  const handleModalUpdateEntity = (updated: EcosystemEntity) => {
    if (isContributing) {
      setDraftEntity(updated);
    } else {
      onUpdateEntity(updated);
    }
  };

  const handleModalOtherArchipelagosChange = (valStr: string) => {
    if (!modalEntity) return;
    const parsedArchs = valStr.split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
    const nonArchFields = filterProfileTags(modalEntity.fields || [], modalEntity);
    const updatedCategorized = {
      ...(modalEntity.categorizedFields || {}),
      Overview: {
        ...((modalEntity.categorizedFields && modalEntity.categorizedFields['Overview']) || {}),
        'Other Archipelagos': valStr
      }
    };
    const updatedExtra = {
      ...(modalEntity.extraFields || {}),
      'Other Archipelagos': valStr,
      'Island/Cluster': valStr
    };
    const updated: EcosystemEntity = {
      ...modalEntity,
      otherArchipelagos: parsedArchs,
      fields: Array.from(new Set([...nonArchFields, ...parsedArchs])).filter(Boolean),
      categorizedFields: updatedCategorized,
      extraFields: updatedExtra
    };
    handleModalUpdateEntity(updated);
  };

  const handleModalAddTag = (tagToAdd?: string) => {
    const trimmed = (tagToAdd ?? newTagInput).trim();
    if (!trimmed) return;
    const current = modalEntity.fields || [];
    if (!current.includes(trimmed)) {
      handleModalUpdateEntity({
        ...modalEntity,
        fields: [...current, trimmed]
      });
      setNewTagInput('');
    }
  };

  const handleModalRemoveTag = (tagToRemove: string) => {
    handleModalUpdateEntity({
      ...modalEntity,
      fields: (modalEntity.fields || []).filter(f => f !== tagToRemove)
    });
  };

  const handleModalAddApproach = (appToAdd: string) => {
    const trimmed = appToAdd.trim();
    if (!trimmed) return;
    if (modalApproaches.includes(trimmed)) return;
    const updated = [...modalApproaches, trimmed];
    handleModalUpdateEntity({
      ...modalEntity,
      approach: updated,
      categorizedFields: {
        ...(modalEntity.categorizedFields || {}),
        'Overview': {
          ...((modalEntity.categorizedFields && modalEntity.categorizedFields['Overview']) || {}),
          'Approach': updated.join(', ')
        }
      }
    });
  };

  const handleModalRemoveApproach = (appToRemove: string) => {
    const updated = modalApproaches.filter(a => a !== appToRemove);
    handleModalUpdateEntity({
      ...modalEntity,
      approach: updated,
      categorizedFields: {
        ...(modalEntity.categorizedFields || {}),
        'Overview': {
          ...((modalEntity.categorizedFields && modalEntity.categorizedFields['Overview']) || {}),
          'Approach': updated.join(', ')
        }
      }
    });
  };

  const handleModalAddIssue = (issueToAdd: string) => {
    const trimmed = issueToAdd.trim();
    if (!trimmed) return;
    if (modalIssues.includes(trimmed)) return;
    const updated = [...modalIssues, trimmed];
    handleModalUpdateEntity({
      ...modalEntity,
      issues: updated,
      categorizedFields: {
        ...(modalEntity.categorizedFields || {}),
        'Overview': {
          ...((modalEntity.categorizedFields && modalEntity.categorizedFields['Overview']) || {}),
          'Issues': updated.join(', ')
        }
      }
    });
  };

  const handleModalRemoveIssue = (issueToRemove: string) => {
    const updated = modalIssues.filter(i => i !== issueToRemove);
    handleModalUpdateEntity({
      ...modalEntity,
      issues: updated,
      categorizedFields: {
        ...(modalEntity.categorizedFields || {}),
        'Overview': {
          ...((modalEntity.categorizedFields && modalEntity.categorizedFields['Overview']) || {}),
          'Issues': updated.join(', ')
        }
      }
    });
  };

  const handleModalAddActivity = (activityToAdd: string) => {
    const trimmed = activityToAdd.trim();
    if (!trimmed) return;
    if (modalActivities.includes(trimmed)) return;
    const updated = [...modalActivities, trimmed];
    handleModalUpdateEntity({
      ...modalEntity,
      activities: updated,
      categorizedFields: {
        ...(modalEntity.categorizedFields || {}),
        'Overview': {
          ...((modalEntity.categorizedFields && modalEntity.categorizedFields['Overview']) || {}),
          'Activities': updated.join(', ')
        }
      }
    });
  };

  const handleModalRemoveActivity = (activityToRemove: string) => {
    const updated = modalActivities.filter(a => a !== activityToRemove);
    handleModalUpdateEntity({
      ...modalEntity,
      activities: updated,
      categorizedFields: {
        ...(modalEntity.categorizedFields || {}),
        'Overview': {
          ...((modalEntity.categorizedFields && modalEntity.categorizedFields['Overview']) || {}),
          'Activities': updated.join(', ')
        }
      }
    });
  };

  const handleStartContribution = () => {
    if (!entity) return;
    setDraftEntity(JSON.parse(JSON.stringify(entity)));
    setIsContributing(true);
  };

  const handleCancelContribution = () => {
    setIsContributing(false);
    setDraftEntity(null);
    setIsEmailModalOpen(false);
    setSubmitterRelationship('');
  };

  const handleSubmitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrimmed = submitterEmail.trim();
    if (!emailTrimmed) {
      setEmailError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setEmailError("Please enter a valid email address (e.g. name@domain.org).");
      return;
    }

    setIsSubmittingContribution(true);
    try {
      if (entity && draftEntity) {
        await saveContributionSubmission(entity, draftEntity, emailTrimmed, submitterRelationship);
      }
      setIsEmailModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error('Failed to submit contribution:', err);
      // Fallback: still show success since local storage cache catches it
      setIsEmailModalOpen(false);
      setIsSuccessModalOpen(true);
    } finally {
      setIsSubmittingContribution(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false);
    setIsContributing(false);
    setDraftEntity(null);
    setSubmitterEmail('');
    setSubmitterRelationship('');
  };

  // Back button text and handler for returning from Entity Details to current list scope
  let backButtonLabel = '';
  let onBackAction: (() => void) | null = null;

  if (activeListScope) {
    if (activeListScope.type === 'continent') {
      backButtonLabel = `Back to ${activeListScope.name} List`;
    } else if (activeListScope.type === 'category') {
      backButtonLabel = activeListScope.entityType 
        ? `Back to ${activeListScope.category} (${activeListScope.entityType === 'Person' ? 'People' : activeListScope.entityType + 's'})`
        : `Back to ${activeListScope.category} Change List`;
    } else if (activeListScope.type === 'relationship') {
      backButtonLabel = activeListScope.entityType
        ? `Back to "${activeListScope.relationship}" (${activeListScope.entityType === 'Person' ? 'People' : activeListScope.entityType + 's'})`
        : `Back to "${activeListScope.relationship}" List`;
    } else if (activeListScope.type === 'entityType') {
      backButtonLabel = `Back to ${activeListScope.entityType === 'All' ? 'All Entities' : activeListScope.entityType + 's'} List`;
    } else if (activeListScope.type === 'tag') {
      backButtonLabel = `Back to "${activeListScope.tag}" List`;
    }
    onBackAction = () => onSelectEntity(null);
  } else if (selectedContinentName) {
    backButtonLabel = `Back to ${selectedContinentName} List`;
    onBackAction = () => onSelectEntity(null);
  } else if (entContinent && onSelectContinent) {
    backButtonLabel = `Back to ${entContinent} List`;
    onBackAction = () => onSelectContinent(entContinent);
  }

  const getSocialPlatformIcon = (platform: SocialLink['platform']) => {
    switch (platform) {
      case 'twitter':
        return Twitter;
      case 'linkedin':
        return Linkedin;
      case 'instagram':
        return Instagram;
      case 'youtube':
        return Youtube;
      case 'facebook':
        return Facebook;
      case 'github':
        return Github;
      default:
        return Globe;
    }
  };

  return (
    <>
      {!enlargedOnly && !fullPageEmbedded && (
        <aside className="w-96 max-w-full bg-white border-l border-[#E5E7EB] flex flex-col h-full z-30 shadow-lg relative select-text overflow-hidden">
        {/* Edit Mode Alert Banner */}
        {editMode && (
          <div className="bg-[#D9C01B] border-b border-[#111827] px-4 py-2 flex items-center justify-between text-[#111827] font-technical text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              <span>EDIT MODE ACTIVE</span>
            </div>
            <span className="text-[10px] bg-[#111827] text-white px-2 py-0.5 rounded-[2px] uppercase">
              Auto-Sync On
            </span>
          </div>
        )}

      {/* Header */}
      <div className="p-4 border-b border-[#E5E7EB] bg-[#FAF8F5] flex flex-col gap-2.5">
        {/* Top bar: Back to List Scope button aligned with Action buttons (Enlarge & Close) */}
        <div className="flex items-center justify-between gap-2 min-h-[28px]">
          {onBackAction && backButtonLabel ? (
            <button
              onClick={onBackAction}
              className="flex items-center space-x-1 font-technical text-[10px] uppercase font-semibold text-[#8C877F] hover:text-[#111827] transition-colors cursor-pointer truncate"
            >
              <ArrowLeft className="w-3 h-3 shrink-0" />
              <span className="truncate">{backButtonLabel}</span>
            </button>
          ) : (
            <div />
          )}

          {/* Action buttons: Enlarge and Close moved upwards, aligned to the top row */}
          <div className="flex items-center space-x-1 shrink-0 ml-auto">
            <button
              id="enlarge-entity-focus-btn"
              onClick={() => setIsEnlarged(true)}
              className="p-1.5 text-[#8C877F] hover:text-[#111827] hover:bg-white rounded-[4px] transition-colors cursor-pointer"
              title="Enlarge content and focus in center"
              aria-label="Enlarge content and focus in center"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              id="close-entity-profile-btn"
              onClick={onClose}
              className="p-1.5 text-[#8C877F] hover:text-[#111827] hover:bg-white rounded-[4px] transition-colors cursor-pointer"
              title="Close profile"
              aria-label="Close profile"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fields Container (now taking full width to the right, eliminating empty space below buttons) */}
        <div className="w-full">
            {editMode ? (
              /* Editable Name & Category / Type in Edit Mode */
              <div className="space-y-2.5">
                {/* Quadrant & Entity Type */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <label className="block text-[9.5px] font-technical uppercase text-[#8C877F] font-semibold mb-1 truncate">
                      Quadrant
                    </label>
                    <select
                      value={entity.category}
                      onChange={(e) => handleFieldChange('category', e.target.value as CategoryQuadrant)}
                      className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-technical font-semibold px-2 py-1 rounded-[3px] outline-none text-[#111827] cursor-pointer shadow-2xs truncate"
                    >
                      <option value="Inner">Inner Quadrant</option>
                      <option value="Social">Social Quadrant</option>
                      <option value="Cultural">Cultural Quadrant</option>
                      <option value="Systems">Systems Quadrant</option>
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[9.5px] font-technical uppercase text-[#8C877F] font-semibold mb-1 truncate">
                      Entity Type
                    </label>
                    <select
                      value={entity.type}
                      onChange={(e) => handleFieldChange('type', e.target.value as EntityType)}
                      className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-technical px-2 py-1 rounded-[3px] outline-none text-[#111827] cursor-pointer shadow-2xs truncate"
                    >
                      <option value="Organization">Organization (Circle)</option>
                      <option value="Person">Person (Lozenge)</option>
                      <option value="Idea">Idea (Round Rect)</option>
                      <option value="Media">Media (Round Square)</option>
                    </select>
                  </div>
                </div>

                {/* Data Completeness */}
                <div className="min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="text-[9.5px] font-technical uppercase text-[#8C877F] font-semibold flex items-center gap-1.5 shrink-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: getCompletenessConfig(getEntityCompleteness(entity)).dotBg }}
                      />
                      <span>Data Completeness</span>
                    </label>
                    <span className="text-[9.5px] font-technical text-[#716C64] truncate">
                      {getCompletenessConfig(getEntityCompleteness(entity)).description}
                    </span>
                  </div>
                  <select
                    value={getEntityCompleteness(entity)}
                    onChange={(e) => {
                      const val = e.target.value as DataCompletenessLevel;
                      handleFieldChange('dataCompleteness', val);
                      handleFieldChange('dataQuality', val);
                    }}
                    className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-technical px-2.5 py-1 rounded-[3px] outline-none text-[#111827] cursor-pointer shadow-2xs"
                    title="Data Completeness"
                  >
                    {DATA_COMPLETENESS_LEVELS.map(lvl => {
                      const cfg = DATA_COMPLETENESS_CONFIG[lvl];
                      return (
                        <option key={lvl} value={lvl}>
                          {cfg.label} ({cfg.description})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="min-w-0">
                  <label className="block text-[9.5px] font-technical uppercase text-[#8C877F] font-semibold mb-1">
                    Entity Name
                  </label>
                  <input
                    type="text"
                    value={entity.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Entity Name..."
                    className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] font-editorial text-lg font-semibold text-[#111827] px-2.5 py-1 rounded-[4px] outline-none shadow-2xs"
                  />
                </div>

                {/* Discrete Map Position in one line right below the title */}
                <div className="flex items-center space-x-1.5 text-[11px] font-technical text-[#716C64] pt-0.5">
                  <Map className="w-3 h-3 text-[#8C877F] shrink-0" />
                  <span>Map position:</span>
                  <span className="text-[#111827] font-medium">X: {Math.round(entity.x)}, Y: {Math.round(entity.y)}</span>
                </div>

                {/* Editable Website Input */}
                <div className="pt-0.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[9.5px] font-technical uppercase text-[#8C877F] font-semibold flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[#8C877F]" />
                      <span>Website</span>
                    </label>
                    {entity.website && (
                      <span className="text-[9.5px] font-technical text-[#716C64] truncate max-w-[170px]">
                        Display: <span className="text-[#111827] font-medium">{formatDisplayUrl(entity.website)}</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={entity.website || ''}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    placeholder="e.g. ecosia.org or https://ecosia.org"
                    className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-technical text-[#111827] px-2.5 py-1 rounded-[3px] outline-none shadow-2xs"
                  />
                </div>
              </div>
            ) : (
              /* Normal Read-Only View */
              <div>
                <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
                  {entity.quadrant ? (
                    <span
                      className="px-2 py-0.5 text-[10px] font-technical uppercase font-semibold text-white rounded-[2px]"
                      style={{ backgroundColor: categoryColors[entity.quadrant] || '#111827' }}
                    >
                      {entity.quadrant} Quadrant
                    </span>
                  ) : (
                    <span
                      className="px-2 py-0.5 text-[10px] font-technical uppercase font-semibold text-[#4B5563] bg-[#F3F4F6] border border-[#E5E7EB] rounded-[2px]"
                      title="Outside Quadrants (Unassigned)"
                    >
                      Outside Quadrants
                    </span>
                  )}
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-technical uppercase font-medium bg-white border border-[#E5E7EB] text-[#111827] rounded-[2px]">
                    {entity.type === 'Organization' && <span className="w-2 h-2 rounded-full bg-[#111827] inline-block" title="Circle shape" />}
                    {entity.type === 'Person' && <span className="w-1.5 h-1.5 rotate-45 bg-[#0369A1] inline-block" title="Lozenge shape" />}
                    {entity.type === 'Idea' && <span className="w-2.5 h-1.5 rounded-[1px] bg-[#5B21B6] inline-block" title="Rectangle with round borders" />}
                    {entity.type === 'Media' && <span className="w-2 h-2 rounded-[1px] bg-[#7D8764] inline-block" title="Square with round borders" />}
                    <span>{entity.type}</span>
                  </span>

                  {/* Data Completeness Status Pill */}
                  {(() => {
                    const dc = getEntityCompleteness(entity);
                    const cfg = getCompletenessConfig(dc);
                    return (
                      <span 
                        className="inline-flex items-center space-x-1.5 px-2 py-0.5 text-[10px] font-technical bg-white border border-[#E5E7EB] text-[#374151] rounded-[2px]"
                        title={`Data Completeness: ${dc} (${cfg.description})`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0 shadow-2xs border border-white"
                          style={{
                            backgroundColor: cfg.dotBg
                          }}
                        />
                        <span>{dc}</span>
                      </span>
                    );
                  })()}
                </div>

                {/* Entity Logo / Favicon with fallback to Google favicon or type emoji */}
                {(() => {
                  const cleanWeb = cleanWebsiteUrl(entity.website);
                  const effectiveLogo = cleanImageUrl(entity.logo) || cleanImageUrl(entity.favicon) || getFaviconFromWebsite(cleanWeb);
                  return (
                    <div className="flex items-start space-x-3">
                      {effectiveLogo ? (
                        <div className="w-10 h-10 rounded-[6px] border border-[#E5E7EB] bg-white p-1 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs">
                          <img
                            src={effectiveLogo}
                            alt={entity.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const fallbackFavicon = getFaviconFromWebsite(cleanWeb);
                              if (fallbackFavicon && e.currentTarget.src !== fallbackFavicon) {
                                e.currentTarget.src = fallbackFavicon;
                              } else {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.detail-fallback-icon') as HTMLElement | null;
                                if (fallback) fallback.style.display = 'flex';
                              }
                            }}
                          />
                          <span className="detail-fallback-icon hidden text-lg select-none items-center justify-center w-full h-full">
                            {entity.type === 'Person' ? '🧙' : entity.type === 'Idea' ? '🔮' : entity.type === 'Media' ? '🎙️' : '🕸️'}
                          </span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-[6px] border border-[#E5E7EB] bg-white p-1 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs text-lg select-none">
                          {entity.type === 'Person' ? '🧙' : entity.type === 'Idea' ? '🔮' : entity.type === 'Media' ? '🎙️' : '🕸️'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="font-editorial text-2xl font-semibold text-[#111827] leading-tight">
                          {entity.name}
                        </h2>
                      </div>
                    </div>
                  );
                })()}

                {/* Website & Social Media Icons */}
                {(() => {
                  const cleanWeb = entity.website ? (cleanWebsiteUrl(entity.website) || entity.website) : '';
                  const displayWeb = cleanWeb ? formatDisplayUrl(cleanWeb) : '';
                  const href = cleanWeb ? (cleanWeb.startsWith('http') ? cleanWeb : `https://${cleanWeb}`) : '';
                  const hasWebsite = Boolean(displayWeb);
                  const hasSocials = socialLinks.length > 0;
                  // If 1-3 social icons and website URL length is small (e.g. <= 28 chars), align social icons to the right side of the website in one row
                  const canInlineSocials = hasWebsite && hasSocials && displayWeb.length <= 28 && socialLinks.length <= 3;

                  if (!hasWebsite && !hasSocials) return null;

                  if (canInlineSocials) {
                    return (
                      <div className="flex items-center justify-between gap-2 mt-2 pt-0.5 min-w-0">
                        {/* Website on the left */}
                        <div className="flex items-center space-x-1.5 text-[11px] font-technical text-[#716C64] min-w-0 truncate">
                          <Globe className="w-3 h-3 text-[#8C877F] shrink-0" />
                          <a
                            id="entity-website-full-link"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#111827] hover:text-[#5B21B6] underline underline-offset-2 decoration-[#8C877F]/40 hover:decoration-[#5B21B6] transition-colors font-medium truncate"
                            title={`Open ${cleanWeb}`}
                          >
                            {displayWeb}
                          </a>
                          <ExternalLink className="w-2.5 h-2.5 text-[#8C877F] shrink-0 opacity-70" />
                        </div>

                        {/* Social media icons aligned to the right side */}
                        <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
                          {socialLinks.map((link) => {
                            const Icon = getSocialPlatformIcon(link.platform);
                            return (
                              <a
                                key={`${link.platform}-${link.url}`}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center p-1.5 bg-white border border-[#E5E7EB] hover:border-[#111827] hover:bg-[#FAF8F5] text-[#4B5563] hover:text-[#111827] rounded-[4px] transition-all shadow-2xs group"
                                title={`${link.label}: ${link.handle || formatDisplayUrl(link.url)}`}
                                aria-label={link.label}
                              >
                                <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Website below title box: clickable, in full, stripping http://, https://, www. */}
                      {hasWebsite && (
                        <div className="flex items-center space-x-1.5 text-[11px] font-technical text-[#716C64] mt-1.5 min-w-0">
                          <Globe className="w-3 h-3 text-[#8C877F] shrink-0" />
                          <a
                            id="entity-website-full-link"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#111827] hover:text-[#5B21B6] underline underline-offset-2 decoration-[#8C877F]/40 hover:decoration-[#5B21B6] transition-colors font-medium break-all"
                            title={`Open ${cleanWeb}`}
                          >
                            {displayWeb}
                          </a>
                          <ExternalLink className="w-2.5 h-2.5 text-[#8C877F] shrink-0 opacity-70" />
                        </div>
                      )}

                      {/* Clickable Social Media Icons below website */}
                      {hasSocials && (
                        <div className={`flex items-center flex-wrap gap-1.5 ${hasWebsite ? 'mt-2.5 pt-1.5 border-t border-[#E5E7EB]' : 'mt-2'}`}>
                          {socialLinks.map((link) => {
                            const Icon = getSocialPlatformIcon(link.platform);
                            return (
                              <a
                                key={`${link.platform}-${link.url}`}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center p-1.5 bg-white border border-[#E5E7EB] hover:border-[#111827] hover:bg-[#FAF8F5] text-[#4B5563] hover:text-[#111827] rounded-[4px] transition-all shadow-2xs group"
                                title={`${link.label}: ${link.handle || formatDisplayUrl(link.url)}`}
                                aria-label={link.label}
                              >
                                <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Quick Action bar: Focus on Map */}
        <div className="flex items-center">
          <button
            id="focus-map-entity-button"
            onClick={() => {
              if (onFocusEntity) {
                onFocusEntity(entity);
              } else if (onCenterEntity) {
                onCenterEntity(entity);
              }
            }}
            title={
              isMapFocused
                ? "Exit focus mode and show all entities on the map"
                : "Focus on map: highlight connections and hide all other entities"
            }
            aria-label={isMapFocused ? "Exit focus mode" : "Focus on Map"}
            className={`w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-[4px] text-xs font-sans font-medium transition-all cursor-pointer shadow-xs ${
              isMapFocused
                ? 'bg-[#D9C01B] text-[#111827] font-semibold border border-[#BFA510] hover:bg-[#E5CD25]'
                : 'bg-[#111827] text-white hover:bg-[#20293a]'
            }`}
          >
            {isMapFocused ? (
              <EyeOff className="w-4 h-4 text-[#111827]" />
            ) : (
              <Network className="w-4 h-4 text-[#D9C01B]" />
            )}
            <span>{isMapFocused ? 'Exit Map Focus' : 'Focus on Map'}</span>
            {isMapFocused && (
              <span className="text-[9.5px] bg-[#111827] text-white px-1.5 py-0.5 rounded-[2px] ml-1 uppercase font-technical font-semibold">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Ecotones (Intersections) - only shown if entity belongs to an ecotone (or in edit mode) */}
        {(editMode || isEntityEcotone(entity)) && (
          <div className={`p-3.5 border rounded-[4px] transition-all ${
            isEntityEcotone(entity)
              ? 'bg-[#FAF8F5] border-[#111827]/30 shadow-xs'
              : 'bg-white border-[#E5E7EB]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-technical text-[11px] text-[#111827] uppercase tracking-wider font-semibold flex items-center space-x-1.5">
                <span className="text-sm">🌿</span>
                <span>Ecotones (Intersections)</span>
              </span>
              {isEntityEcotone(entity) && (
                <span className="font-technical text-[9px] bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] px-1.5 py-0.5 rounded-[2px] font-bold uppercase tracking-wider">
                  Intersection
                </span>
              )}
            </div>

            {editMode ? (
              <div className="space-y-3 pt-1">
                <label className="flex items-center space-x-2 text-xs font-sans cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!(entity.isTransitionZone || entity.isDomainElevation)}
                    onChange={(e) => {
                      handleFieldChange('isTransitionZone', e.target.checked);
                      handleFieldChange('isDomainElevation', e.target.checked);
                    }}
                    className="rounded text-[#111827] focus:ring-0"
                  />
                  <span className="font-medium text-[#111827]">Place in Ecotone (Intersection)</span>
                </label>

                <div>
                  <span className="font-technical text-[10px] text-[#8C877F] uppercase tracking-wider block mb-1">
                    Secondary Intersecting Quadrants
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['Inner', 'Social', 'Cultural', 'Systems'] as CategoryQuadrant[]).map(cat => {
                      if (cat === entity.category) return null;
                      const isChecked = entity.secondaryCategories?.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            const current = entity.secondaryCategories || [];
                            const updated = isChecked
                              ? current.filter(c => c !== cat)
                              : [...current, cat];
                            handleFieldChange('secondaryCategories', updated.length > 0 ? updated : undefined);
                            if (updated.length > 0) {
                              handleFieldChange('isTransitionZone', true);
                              handleFieldChange('isDomainElevation', true);
                            }
                          }}
                          className={`flex items-center space-x-1.5 px-2 py-1 border rounded-[3px] text-xs font-sans text-left transition-all ${
                            isChecked
                              ? 'bg-[#111827] text-white border-[#111827]'
                              : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#111827]'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: categoryColors[cat] || '#8C877F' }}
                          />
                          <span className="truncate text-[11px] font-medium">{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              (() => {
                const zone = getEntityIntersectionZone(entity);
                return (
                  <div className="space-y-2.5">
                    {/* Highlighted Zone Badge Header */}
                    {zone && (
                      <div className="p-2.5 bg-white border border-[#BBF7D0] rounded-[4px] shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-technical text-[10px] text-[#166534] font-bold uppercase tracking-wider flex items-center space-x-1">
                            <span>{zone.glyph}</span>
                            <span>{zone.name}</span>
                          </span>
                          <span className="text-[8.5px] font-technical uppercase px-1 py-0.2 bg-[#DCFCE7] text-[#166534] rounded-[2px] font-semibold">
                            {zone.axisType === 'diagonal' ? 'Diagonal Spine' : zone.axisType === 'omni' ? 'Nexus' : 'Corridor'}
                          </span>
                        </div>
                        <p className="font-sans text-[11px] text-[#4B5563] leading-snug">
                          {zone.description}
                        </p>
                      </div>
                    )}

                    <p className="font-sans text-xs text-[#4B5563] leading-relaxed">
                      This entity sits in an Ecotone (Intersection), bridging the <strong>{entity.category}</strong> quadrant with multiple complementary fields of action:
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {/* Primary badge */}
                      <span
                        className="px-2 py-0.5 text-[10px] font-technical uppercase font-bold text-white rounded-[2px] shadow-xs flex items-center space-x-1"
                        style={{ backgroundColor: categoryColors[entity.category] || '#111827' }}
                      >
                        <span>Primary: {entity.category}</span>
                      </span>

                      <span className="text-[#8C877F] font-technical text-xs">⟷</span>

                      {/* Secondary category badges */}
                      {entity.secondaryCategories && entity.secondaryCategories.length > 0 ? (
                        entity.secondaryCategories.map(cat => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 text-[10px] font-technical uppercase font-semibold border rounded-[2px] flex items-center space-x-1 bg-white text-[#111827] border-[#111827]/40 shadow-xs"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full inline-block"
                              style={{ backgroundColor: categoryColors[cat] || '#8C877F' }}
                            />
                            <span>{cat} Change</span>
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-technical uppercase font-semibold border rounded-[2px] bg-white text-[#4B5563] border-[#E5E7EB]">
                          All 4 Convergence Slopes
                        </span>
                      )}
                    </div>

                    {(entity.extraFields?.['Elevation Axis'] || entity.extraFields?.['Elevation Ridge']) && (
                      <div className="font-technical text-[10px] text-[#8C877F] pt-1 border-t border-[#E5E7EB]">
                        Elevation Axis: <span className="font-semibold text-[#111827]">{String(entity.extraFields['Elevation Axis'] || entity.extraFields['Elevation Ridge']).replace(/\s*Ridge/gi, '')}</span>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Archipelago Territory & Landmass Info */}
        <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-technical text-[11px] text-[#8C877F] uppercase tracking-wider flex items-center space-x-1">
              <Globe className="w-3.5 h-3.5 text-[#5B21B6]" />
              <span>Archipelago</span>
            </span>
            {editMode && (
              <button
                onClick={handleAutoSuggestContinent}
                title="Auto-suggest archipelago based on entity fields & category"
                className="font-technical text-[10px] text-[#5B21B6] hover:underline flex items-center space-x-1"
              >
                <Wand2 className="w-3 h-3" />
                <span>Auto-Suggest</span>
              </button>
            )}
          </div>

          {editMode ? (
            <div>
              <input
                type="text"
                value={entity.continent || ''}
                onChange={(e) => handleFieldChange('continent', e.target.value)}
                placeholder="Archipelago name (e.g. Commonwealth of the Commons)..."
                className="w-full bg-white border border-[#E5E7EB] text-xs font-sans px-2 py-1.5 rounded-[4px] outline-none"
              />
              <span className="font-technical text-[10px] text-[#8C877F] mt-1 block">
                Leave empty or click Auto-Suggest to calculate archipelago from tags.
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {entContinent ? (
                <>
                  <span className="font-editorial text-sm font-semibold text-[#111827]">
                    {entContinent}
                  </span>
                  {onSelectContinent && (
                    <button
                      onClick={() => {
                        if (isEnlarged) setIsEnlarged(false);
                        if (enlargedOnly || fullPageEmbedded) onClose();
                        onSelectEntity(null);
                        onSelectContinent(entContinent);
                        const targetCont = continents.find(c => c.name === entContinent || formatClusterWithNumber(c.name).toLowerCase() === formatClusterWithNumber(entContinent).toLowerCase());
                        if (targetCont && onFlyToContinent) {
                          onFlyToContinent(targetCont);
                        }
                      }}
                      className="font-technical text-[10px] text-[#5B21B6] hover:underline font-semibold cursor-pointer"
                    >
                      View Archipelago Overview →
                    </button>
                  )}
                </>
              ) : (
                <span className="font-sans text-xs italic text-[#9CA3AF]">
                  None (Unassigned)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Other Archipelagos (placed right below Archipelago) - only shown if non-empty or in edit mode */}
        {(editMode || getEntityOtherArchipelagos(entity).length > 0) && (
          <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-technical text-[11px] text-[#8C877F] uppercase tracking-wider flex items-center space-x-1.5">
                <Compass className="w-3.5 h-3.5 text-[#5B21B6]" />
                <span>Other Archipelagos</span>
              </span>
              {editMode && (
                <span className="font-technical text-[10px] text-[#7D8764] uppercase font-semibold">
                  Editable
                </span>
              )}
            </div>

            {editMode ? (
              <div>
                <input
                  type="text"
                  value={
                    entity.otherArchipelagos && entity.otherArchipelagos.length > 0
                      ? entity.otherArchipelagos.join(', ')
                      : (entity.extraFields?.['Other Archipelagos'] as string) || (entity.categorizedFields?.['Overview']?.['Other Archipelagos'] as string) || ''
                  }
                  onChange={(e) => handleOtherArchipelagosChange(e.target.value)}
                  placeholder="Comma-separated other archipelagos (e.g. 4. Contemplative Education, 22. Regenerative Education)..."
                  className="w-full bg-white border border-[#E5E7EB] text-xs font-sans px-2 py-1.5 rounded-[4px] outline-none"
                />
                <span className="font-technical text-[10px] text-[#8C877F] mt-1 block">
                  Comma-separated archipelagos this entity is affiliated with in addition to primary.
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {getEntityOtherArchipelagos(entity).map(archName => (
                  <button
                    key={archName}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectArchipelagoFromOverview(archName);
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-[#FAF8F5] border border-[#5B21B6]/30 hover:border-[#5B21B6] text-[#5B21B6] rounded-[4px] font-sans text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer group text-left"
                    title={`Click to show all entities in "${archName}" on map and right sidebar`}
                  >
                    <Globe className="w-3 h-3 text-[#5B21B6] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-medium select-text">{archName}</span>
                    <span className="text-[10px] text-[#5B21B6]/60 group-hover:text-[#5B21B6] ml-0.5">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Our Relationship (moved from Overview section to below Archipelago) */}
        <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-technical text-[11px] text-[#8C877F] uppercase tracking-wider flex items-center space-x-1.5">
              <span className="text-xs">🤝</span>
              <span>Our Relationship</span>
            </span>
            {editMode && (
              <span className="font-technical text-[10px] text-[#7D8764] uppercase font-semibold">
                Editable
              </span>
            )}
          </div>

          {editMode ? (
            <div>
              <input
                type="text"
                value={entity.ourRelationship || entity.categorizedFields?.['Overview']?.['Our Relationship'] || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handleFieldChange('ourRelationship', val);
                  const updatedCategorized = {
                    ...(entity.categorizedFields || {}),
                    Overview: {
                      ...((entity.categorizedFields && entity.categorizedFields['Overview']) || {}),
                      'Our Relationship': val
                    }
                  };
                  onUpdateEntity({
                    ...entity,
                    ourRelationship: val,
                    categorizedFields: updatedCategorized
                  });
                }}
                placeholder="Relationship with entity..."
                className="w-full bg-white border border-[#E5E7EB] text-xs font-sans px-2 py-1.5 rounded-[4px] outline-none"
              />
            </div>
          ) : (
            <div>
              {(() => {
                const rawRel = entity.ourRelationship || entity.categorizedFields?.['Overview']?.['Our Relationship'] || (entity.extraFields?.['Our Relationship'] as string);
                if (!rawRel || !String(rawRel).trim()) {
                  return (
                    <span className="font-sans text-xs text-[#8C877F] italic font-normal">
                      None specified
                    </span>
                  );
                }
                const relItems = splitRelationshipValues(String(rawRel));
                if (relItems.length === 0) {
                  return (
                    <span className="font-sans text-xs text-[#8C877F] italic font-normal">
                      None specified
                    </span>
                  );
                }
                return (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {relItems.map((relItem, rIdx) => (
                      <button
                        key={rIdx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectRelationshipList) {
                            onSelectRelationshipList(relItem);
                          }
                        }}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-white hover:bg-[#F0FDF4] border border-[#BBF7D0] hover:border-[#15803D] text-[#15803D] rounded-[4px] font-sans text-xs font-semibold shadow-2xs hover:shadow-xs hover:scale-[1.01] transition-all cursor-pointer group text-left"
                        title={`Click to show all entities with relationship "${relItem}" on map and right sidebar`}
                      >
                        <span className="text-xs shrink-0 select-none">🤝</span>
                        <span className="font-medium select-text">{relItem}</span>
                        <span className="text-[10px] text-[#15803D]/60 group-hover:text-[#15803D] group-hover:translate-x-0.5 transition-all ml-0.5">→</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Map Coordinates in Edit Mode */}
        {editMode && (
          <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-technical text-[11px] text-[#8C877F] uppercase tracking-wider flex items-center space-x-1">
                <Map className="w-3.5 h-3.5 text-[#4FC1E0]" />
                <span>Map Coordinates</span>
              </span>
              <span className="font-technical text-[10px] text-[#7D8764] uppercase font-semibold">
                Editable
              </span>
            </div>

            <div className="flex items-center space-x-3 mt-2">
              <div className="flex-1">
                <label className="font-technical text-[10px] text-[#8C877F] block">X Coordinate</label>
                <input
                  type="number"
                  value={Math.round(entity.x)}
                  onChange={(e) => onUpdateEntityCoordinates(entity.id, Number(e.target.value), entity.y)}
                  className="w-full bg-white border border-[#E5E7EB] text-xs font-technical px-2 py-1 rounded-[2px]"
                />
              </div>
              <div className="flex-1">
                <label className="font-technical text-[10px] text-[#8C877F] block">Y Coordinate</label>
                <input
                  type="number"
                  value={Math.round(entity.y)}
                  onChange={(e) => onUpdateEntityCoordinates(entity.id, entity.x, Number(e.target.value))}
                  className="w-full bg-white border border-[#E5E7EB] text-xs font-technical px-2 py-1 rounded-[2px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {(editMode || filterProfileTags(entity.fields || [], entity).length > 0) && (
          <div>
            {(() => {
              const displayTags = filterProfileTags(entity.fields || [], entity);
              return (
                <>
                  <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#7D8764]" />
                    <span>Tags ({displayTags.length})</span>
                  </h3>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {displayTags.length === 0 ? (
                      <span className="text-[11px] font-sans text-[#8C877F] italic">No tags listed.</span>
                    ) : (
                      displayTags.map(field => (
                        <button
                          type="button"
                          key={field}
                          onClick={() => {
                            const selection = window.getSelection();
                            if (selection && selection.toString().trim().length > 0) return;
                            if (!editMode && onSelectTagList) {
                              onSelectTagList(field, entity.category, 'tag');
                            }
                          }}
                          className={`px-2.5 py-1 bg-white border border-[#E5E7EB] text-[#111827] font-sans text-xs rounded-[4px] shadow-2xs flex items-center space-x-1 text-left select-text ${
                            !editMode ? 'hover:border-[#111827] hover:bg-[#FAF8F5] cursor-pointer' : ''
                          } ${editMode ? 'pr-1.5' : ''}`}
                          title={!editMode ? `Filter entities by tag: ${field}` : undefined}
                        >
                          <span className="select-text">{field}</span>
                          {editMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTag(field);
                              }}
                              title={`Remove tag ${field}`}
                              className="p-0.5 text-[#8C877F] hover:text-[#AD2831] hover:bg-[#FAF8F5] rounded-[2px]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              );
            })()}

            {editMode && (
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="text"
                  placeholder="Add new tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                  className="flex-1 bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans px-2.5 py-1 rounded-[4px] outline-none"
                />
                <button
                  onClick={handleAddTag}
                  className="flex items-center space-x-1 px-3 py-1 bg-[#111827] text-white text-xs font-sans rounded-[4px] hover:bg-[#20293a]"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Tag</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Description (moved to below Tags) */}
        {(editMode || (entity.description && entity.description.trim().length > 0)) && (
          <div>
            <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2">
              Description
            </h3>
            {editMode ? (
              <textarea
                value={entity.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Entity summary & mission statement..."
                className="w-full h-28 bg-white border border-[#E5E7EB] focus:border-[#111827] p-2.5 text-xs font-sans rounded-[4px] outline-none text-[#111827] resize-none"
              />
            ) : (
              <p className="font-sans text-[12.5px] text-[#4B5563] leading-relaxed bg-[#FAF8F5] p-3 border border-[#E5E7EB] rounded-[4px]">
                {entity.description}
              </p>
            )}
          </div>
        )}

        {/* Approach */}
        {(entityApproaches.length > 0 || editMode) && (
          <div>
            <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Approach ({entityApproaches.length})</span>
            </h3>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {entityApproaches.length === 0 ? (
                <span className="text-[11px] font-sans text-[#8C877F] italic">No approach specified.</span>
              ) : (
                entityApproaches.map(app => (
                  <button
                    type="button"
                    key={app}
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.toString().trim().length > 0) return;
                      if (!editMode && onSelectTagList) {
                        onSelectTagList(app, entity.category, 'approach');
                      }
                    }}
                    className={`px-2.5 py-1 bg-sky-50/60 border border-sky-200 text-sky-900 font-sans text-xs rounded-[4px] shadow-2xs flex items-center space-x-1 text-left select-text ${
                      !editMode ? 'hover:border-sky-500 hover:bg-sky-100/70 cursor-pointer' : ''
                    }`}
                    title={!editMode ? `Filter entities by approach: ${app}` : undefined}
                  >
                    <span className="select-text">{app}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Issues */}
        {(entityIssues.length > 0 || editMode) && (
          <div>
            <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[#AD2831]" />
              <span>Issues ({entityIssues.length})</span>
            </h3>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {entityIssues.length === 0 ? (
                <span className="text-[11px] font-sans text-[#8C877F] italic">No issues specified.</span>
              ) : (
                entityIssues.map(iss => (
                  <button
                    type="button"
                    key={iss}
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.toString().trim().length > 0) return;
                      if (!editMode && onSelectTagList) {
                        onSelectTagList(iss, entity.category, 'issues');
                      }
                    }}
                    className={`px-2.5 py-1 bg-rose-50/60 border border-rose-200 text-rose-900 font-sans text-xs rounded-[4px] shadow-2xs flex items-center space-x-1 text-left select-text ${
                      !editMode ? 'hover:border-rose-500 hover:bg-rose-100/70 cursor-pointer' : ''
                    }`}
                    title={!editMode ? `Filter entities by issue: ${iss}` : undefined}
                  >
                    <span className="select-text">{iss}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Activities */}
        {(entityActivities.length > 0 || editMode) && (
          <div>
            <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-[#7D8764]" />
              <span>Activities ({entityActivities.length})</span>
            </h3>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {entityActivities.length === 0 ? (
                <span className="text-[11px] font-sans text-[#8C877F] italic">No activities specified.</span>
              ) : (
                entityActivities.map(act => (
                  <button
                    type="button"
                    key={act}
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.toString().trim().length > 0) return;
                      if (!editMode && onSelectTagList) {
                        onSelectTagList(act, entity.category, 'activities');
                      }
                    }}
                    className={`px-2.5 py-1 bg-emerald-50/60 border border-emerald-200 text-emerald-900 font-sans text-xs rounded-[4px] shadow-2xs flex items-center space-x-1 text-left select-text ${
                      !editMode ? 'hover:border-emerald-500 hover:bg-emerald-100/70 cursor-pointer' : ''
                    }`}
                    title={!editMode ? `Filter entities by activity: ${act}` : undefined}
                  >
                    <span className="select-text">{act}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Metadata Details Grid */}
        <div>
          <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2">
            Details & Metadata
          </h3>

          {editMode ? (
            /* Editable Metadata Form in Edit Mode */
            <div className="grid grid-cols-2 gap-3 text-xs font-sans">
              <div>
                <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Location</label>
                <input
                  type="text"
                  value={entity.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  placeholder="e.g. Global / Germany"
                  className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs"
                />
              </div>

              <div>
                <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Language</label>
                <input
                  type="text"
                  value={entity.language || ''}
                  onChange={(e) => handleFieldChange('language', e.target.value)}
                  placeholder="e.g. English"
                  className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs"
                />
              </div>

              <div>
                <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Stage / Maturity</label>
                <input
                  type="text"
                  value={entity.stage || ''}
                  onChange={(e) => handleFieldChange('stage', e.target.value)}
                  placeholder="e.g. Movement"
                  className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs"
                />
              </div>

              <div>
                <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Contact Email</label>
                <input
                  type="text"
                  value={entity.contactEmail || ''}
                  onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                  placeholder="email@org.org"
                  className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Website URL</label>
                <input
                  type="text"
                  value={entity.website || ''}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs"
                />
              </div>
            </div>
          ) : (
            /* Read-Only Metadata Grid in Normal View */
            <div className="grid grid-cols-2 gap-3 text-xs font-sans">
              {entity.location && (
                <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                  <span className="font-technical text-[10px] text-[#8C877F] block uppercase">Location</span>
                  <span className="font-medium text-[#111827]">{entity.location}</span>
                </div>
              )}
              {entity.language && (
                <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                  <span className="font-technical text-[10px] text-[#8C877F] block uppercase">Language</span>
                  <span className="font-medium text-[#111827]">{entity.language}</span>
                </div>
              )}
              {entity.stage && (
                <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                  <span className="font-technical text-[10px] text-[#8C877F] block uppercase">Stage / Maturity</span>
                  <span className="font-medium text-[#111827]">{entity.stage}</span>
                </div>
              )}
              {entity.contactEmail && (
                <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] truncate">
                  <span className="font-technical text-[10px] text-[#8C877F] block uppercase">Contact</span>
                  <span className="font-medium text-[#111827] truncate block">{entity.contactEmail}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Categorized Fields Section */}
        <CategorizedFieldsSection
          entity={entity}
          editMode={editMode}
          onUpdateEntity={onUpdateEntity}
          allEntities={allEntities}
          onSelectEntity={onSelectEntity}
          onSelectUnmappedNode={setUnmappedPopupEntity}
          onSelectCategory={handleSelectCategoryFromOverview}
          onSelectArchipelago={handleSelectArchipelagoFromOverview}
          onSelectTag={handleSelectTagFromOverview}
          onSelectRelationship={onSelectRelationshipList}
        />

        {/* Curator Notes (Analyst Commentary) - only shown if non-empty or in edit mode */}
        {(() => {
          const isNoteDuplicateOfSector = entity.notes && (
            (entity.societalSector && entity.notes.trim().toLowerCase() === entity.societalSector.trim().toLowerCase()) ||
            (entity.categorizedFields?.['Overview']?.['Societal Sector'] && entity.notes.trim().toLowerCase() === String(entity.categorizedFields['Overview']['Societal Sector']).trim().toLowerCase())
          );
          const effectiveNotes = isNoteDuplicateOfSector ? '' : (entity.notes || '');

          if (!editMode && !effectiveNotes.trim()) {
            return null;
          }

          return (
            <div>
              <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#5B21B6]" />
                  <span>Map Curator Notes</span>
                </div>
                <span className="font-technical text-[10px] text-[#8C877F] uppercase tracking-wider">Analyst Commentary</span>
              </h3>

              {editMode ? (
                /* Editable Curator Notes in Edit Mode */
                <textarea
                  value={effectiveNotes}
                  onChange={(e) => {
                    onUpdateEntityNotes(entity.id, e.target.value);
                  }}
                  placeholder="Add long-term curator notes / analyst commentary..."
                  className="w-full h-24 bg-white border border-[#E5E7EB] focus:border-[#111827] p-2.5 text-xs font-sans rounded-[4px] outline-none text-[#111827] resize-none"
                />
              ) : (
                /* Read-Only Curator Notes Card in Normal View */
                <div className="bg-[#FAF8F5] border-l-2 border-[#5B21B6] p-3 border border-[#E5E7EB] rounded-r-[4px] text-xs font-sans text-[#111827] leading-relaxed">
                  {effectiveNotes}
                </div>
              )}
            </div>
          );
        })()}

        {/* Community Notes Section */}
        <CommunityNotesSection
          entity={entity}
          editMode={editMode}
          onAddNote={onAddCommunityNote || ((id, author, content) => {})}
          onDeleteNote={onDeleteCommunityNote}
        />

        {/* Locate on the map button at the bottom of the profile */}
        <div className="pt-4 border-t border-[#E5E7EB] mt-4">
          <button
            type="button"
            id="locate-on-map-sidebar-bottom-btn"
            onClick={() => onCenterEntity(entity)}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#111827] hover:bg-[#1F2937] text-white rounded-[5px] text-xs font-sans font-semibold transition-all shadow-xs cursor-pointer group"
            title={`Locate ${entity.name} on the map`}
          >
            <Navigation className="w-4 h-4 text-[#D9C01B] transition-transform group-hover:scale-110" />
            <span>Locate on the map</span>
          </button>
        </div>
      </div>
    </aside>
  )}

      {/* Centered Enlarged Focus Modal / Full Page Embedded View */}
      {(() => {
        const enlargedInnerContent = (
          <>
            {/* Edit Mode Alert Banner */}
              {editMode && (
                <div className="bg-[#D9C01B] border-b border-[#111827] px-5 py-2 flex items-center justify-between text-[#111827] font-technical text-xs font-semibold">
                  <div className="flex items-center space-x-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>EDIT MODE ACTIVE — FOCUSED VIEW</span>
                  </div>
                  <span className="text-[10px] bg-[#111827] text-white px-2 py-0.5 rounded-[2px] uppercase">
                    Auto-Sync On
                  </span>
                </div>
              )}

              {/* Community Improvement Alert Banner */}
              {isContributing && (
                <div className="bg-[#FEFCE8] border-b border-[#FEF08A] px-5 py-2.5 flex items-center justify-between text-[#854D0E] font-technical text-xs font-semibold">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">🌱</span>
                    <span>COMMUNITY CONTRIBUTION MODE — You are editing data for <strong>{modalEntity.name}</strong></span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleCancelContribution}
                      className="text-[11px] text-[#713F12] hover:text-[#111827] underline cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailError(null);
                        setIsEmailModalOpen(true);
                      }}
                      className="px-3 py-1 bg-[#111827] text-white hover:bg-[#1F2937] rounded-[3px] text-[11px] font-technical font-semibold cursor-pointer shadow-xs"
                    >
                      Submit Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Header */}
              <div className="p-5 md:p-6 border-b border-[#E5E7EB] bg-[#FAF8F5]">
                {/* Top bar: Back action, Tags, and Window controls (Dock & Close) */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1 min-w-0">
                    {onBackAction && backButtonLabel && (
                      <button
                        onClick={() => {
                          setIsEnlarged(false);
                          onBackAction();
                        }}
                        className="flex items-center space-x-1 font-technical text-[10px] uppercase font-semibold text-[#8C877F] hover:text-[#111827] transition-colors cursor-pointer mr-1"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        <span>{backButtonLabel}</span>
                      </button>
                    )}

                    {isModalEditMode ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={modalEntity.category}
                          onChange={(e) => handleModalFieldChange('category', e.target.value as CategoryQuadrant)}
                          className="bg-white border border-[#E5E7EB] text-xs font-technical font-semibold px-2.5 py-1 rounded-[3px] outline-none text-[#111827]"
                        >
                          <option value="Inner">Inner Quadrant</option>
                          <option value="Social">Social Quadrant</option>
                          <option value="Cultural">Cultural Quadrant</option>
                          <option value="Systems">Systems Quadrant</option>
                        </select>

                        <select
                          value={modalEntity.type}
                          onChange={(e) => handleModalFieldChange('type', e.target.value as EntityType)}
                          className="bg-white border border-[#E5E7EB] text-xs font-technical px-2.5 py-1 rounded-[3px] outline-none text-[#111827]"
                        >
                          <option value="Organization">Organization</option>
                          <option value="Person">Person</option>
                          <option value="Idea">Idea</option>
                          <option value="Media">Media</option>
                        </select>
                      </div>
                    ) : (
                      <>
                        <span
                          className="px-2.5 py-0.5 text-[10px] font-technical uppercase font-semibold text-white rounded-[2px] shadow-2xs ml-[5px]"
                          style={{ backgroundColor: categoryColors[modalEntity.category] || '#111827', marginLeft: '5px' }}
                        >
                          {modalEntity.category} Quadrant
                        </span>
                        <span className="px-2.5 py-0.5 text-[10px] font-technical uppercase font-medium bg-white border border-[#E5E7EB] text-[#111827] rounded-[2px]">
                          {modalEntity.type}
                        </span>
                        {modalEntContinent && (
                          <span className="px-2.5 py-0.5 text-[10px] font-technical uppercase font-medium bg-white border border-[#E5E7EB] text-[#5B21B6] rounded-[2px] flex items-center gap-1">
                            <Globe className="w-3 h-3 text-[#5B21B6]" />
                            <span>{modalEntContinent}</span>
                          </span>
                        )}
                        {!isContributing && isEntityEcotone(modalEntity) && (
                          <span className="px-2 py-0.5 text-[10px] font-technical uppercase font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] rounded-[2px] flex items-center gap-1">
                            <span>🌿</span>
                            <span>Intersection</span>
                          </span>
                        )}
                        {/* Data Completeness Status Pill aligned with rest of data */}
                        {(() => {
                          const dc = getEntityCompleteness(modalEntity);
                          const cfg = getCompletenessConfig(dc);
                          return (
                            <span 
                              className="inline-flex items-center space-x-1.5 px-2 py-0.5 text-[10px] font-technical bg-white border border-[#E5E7EB] text-[#374151] rounded-[2px]"
                              title={`Data Completeness: ${dc} (${cfg.description})`}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0 shadow-2xs border border-white"
                                style={{
                                  backgroundColor: cfg.dotBg
                                }}
                              />
                              <span>{dc}</span>
                            </span>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  {/* Window action buttons (Dock & Close) */}
                  <div className="shrink-0 flex items-center space-x-1.5">
                    {!enlargedOnly && !fullPageEmbedded && (
                      <button
                        id="dock-enlarged-entity-btn"
                        onClick={() => setIsEnlarged(false)}
                        className="p-1.5 text-[#8C877F] hover:text-[#111827] hover:bg-white rounded-[4px] transition-colors cursor-pointer"
                        title="Dock back to sidebar"
                        aria-label="Dock back to sidebar"
                      >
                        <Minimize2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      id="close-enlarged-modal-btn"
                      onClick={onClose}
                      className="p-1.5 text-[#8C877F] hover:text-[#111827] hover:bg-white rounded-[4px] transition-colors cursor-pointer"
                      title={fullPageEmbedded ? "Back to Directory" : "Close"}
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Entity Main Details & Action Rows */}
                {isModalEditMode ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={modalEntity.name}
                      onChange={(e) => handleModalFieldChange('name', e.target.value)}
                      placeholder="Entity Name..."
                      className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] font-editorial text-2xl md:text-3xl font-bold text-[#111827] px-3 py-1.5 rounded-[4px] outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start space-x-4">
                      {(modalEntity.logo || modalEntity.favicon) ? (
                        <div className="w-12 h-12 rounded-[8px] border border-[#E5E7EB] bg-white p-1.5 shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                          <img
                            src={modalEntity.logo || modalEntity.favicon}
                            alt={modalEntity.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              if (modalEntity.logo && modalEntity.favicon && e.currentTarget.src !== modalEntity.favicon) {
                                e.currentTarget.src = modalEntity.favicon;
                              } else {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.modal-fallback-icon') as HTMLElement | null;
                                if (fallback) fallback.style.display = 'flex';
                              }
                            }}
                          />
                          <span className="modal-fallback-icon hidden text-xl select-none items-center justify-center w-full h-full">
                            {modalEntity.type === 'Person' ? '🧙' : modalEntity.type === 'Idea' ? '🔮' : modalEntity.type === 'Media' ? '🎙️' : '🕸️'}
                          </span>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-[8px] border border-[#E5E7EB] bg-white p-1.5 shrink-0 overflow-hidden flex items-center justify-center shadow-xs text-xl select-none">
                          {modalEntity.type === 'Person' ? '🧙' : modalEntity.type === 'Idea' ? '🔮' : modalEntity.type === 'Media' ? '🎙️' : '🕸️'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="font-editorial text-2xl md:text-3xl lg:text-4xl font-bold text-[#111827] leading-tight tracking-tight">
                          {modalEntity.name}
                        </h2>
                      </div>
                    </div>

                    {/* Discrete Map Position in enlarged modal (only in edit mode) */}
                    {editMode && (
                      <div className="flex items-center space-x-1.5 text-xs font-technical text-[#716C64] mt-2">
                        <Map className="w-3.5 h-3.5 text-[#8C877F] shrink-0" />
                        <span>Map position:</span>
                        <span className="text-[#111827] font-medium">X: {Math.round(modalEntity.x)}, Y: {Math.round(modalEntity.y)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Scrollable Modal Content */}
              <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
                {/* Action & Info Bar: Website, Social Profiles, Help Us Improve Data, and Locate on Map */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB]">
                  {/* Left: Website & Social Media Links */}
                  <div className="flex items-center flex-wrap gap-2.5 min-w-0">
                    {modalEntity.website && (
                      <div className="flex items-center space-x-1.5 text-xs font-technical text-[#716C64] min-w-0">
                        <Globe className="w-3.5 h-3.5 text-[#8C877F] shrink-0" />
                        <a
                          id="enlarged-entity-website-link"
                          href={/^https?:\/\//i.test(modalEntity.website) ? modalEntity.website : `https://${modalEntity.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#111827] hover:text-[#5B21B6] underline underline-offset-2 decoration-[#8C877F]/50 hover:decoration-[#5B21B6] transition-colors font-medium break-all"
                          title={`Visit ${modalEntity.website}`}
                        >
                          {formatDisplayUrl(modalEntity.website)}
                        </a>
                        <ExternalLink className="w-3 h-3 text-[#8C877F] shrink-0 opacity-70" />
                      </div>
                    )}

                    {modalEntity.website && socialLinks.length > 0 && (
                      <span className="text-[#D1D5DB] hidden sm:inline">•</span>
                    )}

                    {socialLinks.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1.5">
                        {socialLinks.map((link) => {
                          const Icon = getSocialPlatformIcon(link.platform);
                          const isPopUp = !fullPageEmbedded;
                          return (
                            <a
                              key={`modal-${link.platform}-${link.url}`}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={
                                isPopUp
                                  ? "w-7 h-7 flex items-center justify-center bg-white border border-[#E5E7EB] hover:border-[#111827] hover:bg-[#FAF8F5] text-[#374151] hover:text-[#111827] rounded-[4px] transition-all shadow-2xs group"
                                  : "inline-flex items-center space-x-1.5 px-2.5 py-1 bg-white border border-[#E5E7EB] hover:border-[#111827] hover:bg-[#FAF8F5] text-[#374151] hover:text-[#111827] rounded-[4px] text-xs font-technical transition-all shadow-2xs group"
                              }
                              title={`${link.label}: ${link.handle || formatDisplayUrl(link.url)}`}
                              aria-label={link.label}
                            >
                              <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                              {!isPopUp && <span className="font-medium">{link.label}</span>}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right: Help Us Improve Data button & Locate on Map button */}
                  <div className="flex items-center space-x-3 ml-auto shrink-0">
                    {!isContributing && !editMode && (
                      <button
                        type="button"
                        id="enlarged-help-improve-btn"
                        onClick={handleStartContribution}
                        className="font-sans text-xs text-[#8C877F] hover:text-[#111827] underline transition-colors cursor-pointer"
                        title="Propose edits or add notes for this entity"
                      >
                        Help us improve this data
                      </button>
                    )}

                    <button
                      type="button"
                      id="locate-on-map-enlarged-header-btn"
                      onClick={() => {
                        setIsEnlarged(false);
                        onCenterEntity(entity);
                      }}
                      className="inline-flex items-center space-x-1.5 py-1.5 px-3 bg-[#111827] hover:bg-[#1F2937] text-white rounded-[4px] text-xs font-technical font-medium transition-all shadow-2xs cursor-pointer group shrink-0"
                      title={`Locate ${entity.name} on the map`}
                    >
                      <Navigation className="w-3.5 h-3.5 text-[#D9C01B] transition-transform group-hover:scale-110" />
                      <span>Locate on the map</span>
                    </button>
                  </div>
                </div>
                {/* 4.a: Relationship question taking up both columns above tags and details & metadata */}
                {isContributing && (() => {
                  const getRelConfig = (type: EntityType) => {
                    switch (type) {
                      case 'Person':
                        return {
                          question: "What's your relationship with this person?",
                          options: [
                            'I am this person',
                            'I am connected to this person',
                            'A person I know of'
                          ]
                        };
                      case 'Idea':
                        return {
                          question: "What's your relationship with this concept?",
                          options: [
                            'I am the originator of this concept',
                            'I am connected to this concept',
                            'A concept I know of'
                          ]
                        };
                      case 'Media':
                        return {
                          question: "What's your relationship with this media?",
                          options: [
                            'I am the creator of this media',
                            'I am connected to this media',
                            'A media I know of'
                          ]
                        };
                      case 'Organization':
                      default:
                        return {
                          question: "What's your relationship with this organization?",
                          options: [
                            'I am part of this org',
                            'I am connected to this organization',
                            'An organization I know of'
                          ]
                        };
                    }
                  };
                  const config = getRelConfig(modalEntity.type);
                  return (
                    <div className="bg-[#FAF8F5] border border-[#E5E7EB] rounded-[6px] p-4 space-y-2.5 shadow-2xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-base">🤝</span>
                        <h3 className="font-editorial text-sm font-semibold text-[#111827]">
                          {config.question}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                        {config.options.map((option) => {
                          const isSelected = submitterRelationship === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setSubmitterRelationship(option)}
                              className={`p-3 rounded-[4px] border text-left text-xs font-sans transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-white border-[#111827] text-[#111827] shadow-xs font-semibold ring-1 ring-[#111827]'
                                  : 'bg-white/80 border-[#E5E7EB] text-[#4B5563] hover:border-[#111827]/40 hover:bg-white'
                              }`}
                            >
                              <span>{option}</span>
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-[#111827] bg-[#111827]' : 'border-[#D1D5DB]'
                              }`}>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left / Narrative Column */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Ecotones (Intersections) (hidden in contribution mode per 4.c) */}
                    {!isContributing && (isModalEditMode || isEntityEcotone(modalEntity)) && (
                      <div className={`p-4 border rounded-[6px] transition-all ${
                        isEntityEcotone(modalEntity)
                          ? 'bg-[#FAF8F5] border-[#111827]/30 shadow-xs'
                          : 'bg-white border-[#E5E7EB]'
                      }`}>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="font-technical text-xs text-[#111827] uppercase tracking-wider font-semibold flex items-center space-x-1.5">
                            <span className="text-base">🌿</span>
                            <span>Ecotones (Intersections)</span>
                          </span>
                          {isEntityEcotone(modalEntity) && (
                            <span className="font-technical text-[9px] bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] px-2 py-0.5 rounded-[2px] font-bold uppercase tracking-wider">
                              Intersection
                            </span>
                          )}
                        </div>

                        {isModalEditMode ? (
                          <div className="space-y-3 pt-1">
                            <label className="flex items-center space-x-2 text-xs font-sans cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!(modalEntity.isTransitionZone || modalEntity.isDomainElevation)}
                                onChange={(e) => {
                                  handleModalFieldChange('isTransitionZone', e.target.checked);
                                  handleModalFieldChange('isDomainElevation', e.target.checked);
                                }}
                                className="rounded text-[#111827] focus:ring-0"
                              />
                              <span className="font-medium text-[#111827]">Place in Ecotone (Intersection)</span>
                            </label>

                            <div>
                              <span className="font-technical text-[10px] text-[#8C877F] uppercase tracking-wider block mb-1">
                                Secondary Intersecting Quadrants
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                {(['Inner', 'Social', 'Cultural', 'Systems'] as CategoryQuadrant[]).map(cat => {
                                  if (cat === modalEntity.category) return null;
                                  const isChecked = modalEntity.secondaryCategories?.includes(cat);
                                  return (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => {
                                        const current = modalEntity.secondaryCategories || [];
                                        const updated = isChecked
                                          ? current.filter(c => c !== cat)
                                          : [...current, cat];
                                        handleModalFieldChange('secondaryCategories', updated.length > 0 ? updated : undefined);
                                        if (updated.length > 0) {
                                          handleModalFieldChange('isTransitionZone', true);
                                          handleModalFieldChange('isDomainElevation', true);
                                        }
                                      }}
                                      className={`flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-[3px] text-xs font-sans text-left transition-all ${
                                        isChecked
                                          ? 'bg-[#111827] text-white border-[#111827]'
                                          : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#111827]'
                                      }`}
                                    >
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: categoryColors[cat] || '#8C877F' }}
                                      />
                                      <span className="truncate text-xs font-medium">{cat}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const zone = getEntityIntersectionZone(modalEntity);
                            return (
                              <div className="space-y-3">
                                {zone && (
                                  <div className="p-3 bg-white border border-[#BBF7D0] rounded-[4px] shadow-2xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-technical text-[11px] text-[#166534] font-bold uppercase tracking-wider flex items-center space-x-1">
                                        <span>{zone.glyph}</span>
                                        <span>{zone.name}</span>
                                      </span>
                                      <span className="text-[9px] font-technical uppercase px-1.5 py-0.5 bg-[#DCFCE7] text-[#166534] rounded-[2px] font-semibold">
                                        {zone.axisType === 'diagonal' ? 'Diagonal Spine' : zone.axisType === 'omni' ? 'Nexus' : 'Corridor'}
                                      </span>
                                    </div>
                                    <p className="font-sans text-xs text-[#4B5563] leading-snug">
                                      {zone.description}
                                    </p>
                                  </div>
                                )}

                                <p className="font-sans text-xs text-[#4B5563] leading-relaxed">
                                  This entity sits in an Ecotone (Intersection), bridging the <strong>{modalEntity.category}</strong> quadrant with multiple complementary fields of action:
                                </p>
                                
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                  <span
                                    className="px-2.5 py-1 text-[10.5px] font-technical uppercase font-bold text-white rounded-[2px] shadow-xs flex items-center space-x-1"
                                    style={{ backgroundColor: categoryColors[modalEntity.category] || '#111827' }}
                                  >
                                    <span>Primary: {modalEntity.category}</span>
                                  </span>

                                  <span className="text-[#8C877F] font-technical text-xs">⟷</span>

                                  {modalEntity.secondaryCategories && modalEntity.secondaryCategories.length > 0 ? (
                                    modalEntity.secondaryCategories.map(cat => (
                                      <span
                                        key={cat}
                                        className="px-2.5 py-1 text-[10.5px] font-technical uppercase font-semibold border rounded-[2px] flex items-center space-x-1.5 bg-white text-[#111827] border-[#111827]/40 shadow-xs"
                                      >
                                        <span
                                          className="w-1.5 h-1.5 rounded-full inline-block"
                                          style={{ backgroundColor: categoryColors[cat] || '#8C877F' }}
                                        />
                                        <span>{cat} Change</span>
                                      </span>
                                    ))
                                  ) : (
                                    <span className="px-2.5 py-1 text-[10.5px] font-technical uppercase font-semibold border rounded-[2px] bg-white text-[#4B5563] border-[#E5E7EB]">
                                      All 4 Convergence Slopes
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    )}

                    {/* Tags */}
                    {(() => {
                      const modalDisplayTags = filterProfileTags(modalEntity.fields || [], modalEntity);
                      if (!isModalEditMode && modalDisplayTags.length === 0) return null;
                      return (
                        <SearchableTagInput
                          label="Tags"
                          count={modalDisplayTags.length}
                          icon={<Tag className="w-3.5 h-3.5 text-[#7D8764]" />}
                          items={modalDisplayTags}
                          availableSuggestions={allExistingTags}
                          isEditable={isModalEditMode}
                          onAddItem={handleModalAddTag}
                          onRemoveItem={handleModalRemoveTag}
                          onSelectTag={(tag) => {
                            setIsEnlarged(false);
                            onSelectTagList?.(tag, modalEntity.category, 'tag');
                          }}
                          badgeStyle={{
                            bg: 'bg-white',
                            border: 'border-[#E5E7EB]',
                            text: 'text-[#111827]',
                            hoverBorder: 'hover:border-[#111827]',
                            hoverBg: 'hover:bg-[#FAF8F5]'
                          }}
                          placeholder="Search or add tag..."
                        />
                      );
                    })()}

                    {/* Description (moved to below Tags) */}
                    {(isModalEditMode || (modalEntity.description && modalEntity.description.trim().length > 0)) && (
                      <div>
                        <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2">
                          Description
                        </h3>
                        {isModalEditMode ? (
                          <textarea
                            value={modalEntity.description || ''}
                            onChange={(e) => handleModalFieldChange('description', e.target.value)}
                            placeholder="Entity summary & mission statement..."
                            className="w-full h-32 bg-white border border-[#E5E7EB] focus:border-[#111827] p-3 text-xs font-sans rounded-[4px] outline-none text-[#111827] resize-none leading-relaxed"
                          />
                        ) : (
                          <div className="font-sans text-[13px] md:text-sm text-[#374151] leading-relaxed bg-[#FAF8F5] p-3.5 border border-[#E5E7EB] rounded-[6px]">
                            {modalEntity.description}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Approach */}
                    {(modalApproaches.length > 0 || isModalEditMode) && (
                      <SearchableTagInput
                        label="Approach"
                        count={modalApproaches.length}
                        icon={<Compass className="w-3.5 h-3.5 text-[#0284C7]" />}
                        items={modalApproaches}
                        availableSuggestions={allExistingApproaches}
                        isEditable={isModalEditMode}
                        onAddItem={handleModalAddApproach}
                        onRemoveItem={handleModalRemoveApproach}
                        onSelectTag={(app) => {
                          setIsEnlarged(false);
                          onSelectTagList?.(app, modalEntity.category, 'approach');
                        }}
                        badgeStyle={{
                          bg: 'bg-sky-50/60',
                          border: 'border-sky-200',
                          text: 'text-sky-900',
                          hoverBorder: 'hover:border-sky-500',
                          hoverBg: 'hover:bg-sky-100/70'
                        }}
                        placeholder="Search or add approach..."
                      />
                    )}

                    {/* Issues */}
                    {(modalIssues.length > 0 || isModalEditMode) && (
                      <SearchableTagInput
                        label="Issues"
                        count={modalIssues.length}
                        icon={<AlertCircle className="w-3.5 h-3.5 text-[#AD2831]" />}
                        items={modalIssues}
                        availableSuggestions={allExistingIssues}
                        isEditable={isModalEditMode}
                        onAddItem={handleModalAddIssue}
                        onRemoveItem={handleModalRemoveIssue}
                        onSelectTag={(iss) => {
                          setIsEnlarged(false);
                          onSelectTagList?.(iss, modalEntity.category, 'issues');
                        }}
                        badgeStyle={{
                          bg: 'bg-rose-50/60',
                          border: 'border-rose-200',
                          text: 'text-rose-900',
                          hoverBorder: 'hover:border-rose-500',
                          hoverBg: 'hover:bg-rose-100/70'
                        }}
                        placeholder="Search or add issue..."
                      />
                    )}

                    {/* Activities */}
                    {(modalActivities.length > 0 || isModalEditMode) && (
                      <SearchableTagInput
                        label="Activities"
                        count={modalActivities.length}
                        icon={<Activity className="w-3.5 h-3.5 text-[#7D8764]" />}
                        items={modalActivities}
                        availableSuggestions={allExistingActivities}
                        isEditable={isModalEditMode}
                        onAddItem={handleModalAddActivity}
                        onRemoveItem={handleModalRemoveActivity}
                        onSelectTag={(act) => {
                          setIsEnlarged(false);
                          onSelectTagList?.(act, modalEntity.category, 'activities');
                        }}
                        badgeStyle={{
                          bg: 'bg-emerald-50/60',
                          border: 'border-emerald-200',
                          text: 'text-emerald-900',
                          hoverBorder: 'hover:border-emerald-500',
                          hoverBg: 'hover:bg-emerald-100/70'
                        }}
                        placeholder="Search or add activity..."
                      />
                    )}

                    {/* Curator Notes (Analyst Commentary) - only shown if non-empty or in edit mode */}
                    {(() => {
                      const isNoteDuplicateOfSector = (modalEntity.notes || entity.notes) && (
                        ((modalEntity.societalSector || entity.societalSector) && (modalEntity.notes || entity.notes)?.trim().toLowerCase() === (modalEntity.societalSector || entity.societalSector)?.trim().toLowerCase()) ||
                        ((modalEntity.categorizedFields?.['Overview']?.['Societal Sector'] || entity.categorizedFields?.['Overview']?.['Societal Sector']) && (modalEntity.notes || entity.notes)?.trim().toLowerCase() === String(modalEntity.categorizedFields?.['Overview']?.['Societal Sector'] || entity.categorizedFields?.['Overview']?.['Societal Sector']).trim().toLowerCase())
                      );
                      const effectiveNotes = isNoteDuplicateOfSector ? '' : (modalEntity.notes || entity.notes || '');

                      if (!editMode && !effectiveNotes.trim()) {
                        return null;
                      }

                      return (
                        <div>
                          <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2 flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-[#5B21B6]" />
                              <span>Map Curator Notes</span>
                            </div>
                            <span className="font-technical text-[10px] text-[#8C877F] uppercase tracking-wider">Analyst Commentary</span>
                          </h3>

                          {editMode ? (
                            <textarea
                              value={effectiveNotes}
                              onChange={(e) => {
                                onUpdateEntityNotes(entity.id, e.target.value);
                              }}
                              placeholder="Add long-term curator notes / analyst commentary..."
                              className="w-full h-28 bg-white border border-[#E5E7EB] focus:border-[#111827] p-3 text-xs font-sans rounded-[4px] outline-none text-[#111827] resize-none"
                            />
                          ) : (
                            <div className="bg-[#FAF8F5] border-l-3 border-[#5B21B6] p-3.5 border border-[#E5E7EB] rounded-r-[4px] text-xs md:text-sm font-sans text-[#111827] leading-relaxed">
                              {effectiveNotes}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Community Notes Section in Enlarged Modal */}
                    <CommunityNotesSection
                      entity={entity}
                      editMode={editMode}
                      onAddNote={onAddCommunityNote || ((id, author, content) => {})}
                      onDeleteNote={onDeleteCommunityNote}
                    />

                    {/* Featured Resources Section (shown below Community Notes in Left Column if filled or in edit mode) */}
                    {Boolean(modalFeaturedResources || isModalEditMode) && (
                      <div className="rounded-[6px] border border-[#FDE68A] bg-[#FFFBEB]/70 p-4 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-[#D97706]" />
                            <h3 className="font-editorial text-sm font-semibold text-[#92400E] uppercase tracking-wider">
                              Featured Resources
                            </h3>
                          </div>
                          <span className="font-technical text-[9px] font-bold text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-[2px] uppercase">
                            Featured
                          </span>
                        </div>

                        {isModalEditMode ? (
                          <div className="space-y-1.5 pt-1">
                            <textarea
                              value={modalFeaturedResources}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleModalFieldChange('extraFields', {
                                  ...(modalEntity.extraFields || {}),
                                  'Featured Resources': val
                                });
                                const updatedCategorized = {
                                  ...(modalEntity.categorizedFields || {}),
                                  'Worldview & Change Orientation': {
                                    ...((modalEntity.categorizedFields && modalEntity.categorizedFields['Worldview & Change Orientation']) || {}),
                                    'Featured Resources': val
                                  }
                                };
                                handleModalUpdateEntity({
                                  ...modalEntity,
                                  extraFields: {
                                    ...(modalEntity.extraFields || {}),
                                    'Featured Resources': val
                                  },
                                  categorizedFields: updatedCategorized
                                });
                              }}
                              placeholder="Enter featured resources (e.g. [Toolkit](https://...), or URLs)..."
                              className="w-full text-xs font-sans p-2 border border-[#E5E7EB] rounded-[4px] bg-white resize-y min-h-[60px] outline-none focus:border-[#5B21B6]"
                              rows={2}
                            />
                            {modalFeaturedResources && (
                              <div className="pt-1">
                                <span className="font-technical text-[9px] text-[#8C877F] uppercase tracking-wider block font-semibold mb-1">
                                  Clickable Preview:
                                </span>
                                <ClickableResourceLinks value={modalFeaturedResources} fieldName="Featured Resources" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="pt-1">
                            <ClickableResourceLinks value={modalFeaturedResources} fieldName="Featured Resources" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Worldview & Change Orientation Section in Left Column */}
                    <div>
                      <CategorizedFieldsSection
                        entity={modalEntity}
                        editMode={isModalEditMode}
                        isContributing={isContributing}
                        onUpdateEntity={handleModalUpdateEntity}
                        isEnlarged={true}
                        allEntities={allEntities}
                        onSelectEntity={onSelectEntity}
                        onSelectUnmappedNode={setUnmappedPopupEntity}
                        onlyCategory="Worldview & Change Orientation"
                        excludeFields={modalFeaturedResources ? ['Featured Resources'] : []}
                        hideHeaderTitle={true}
                      />
                    </div>
                  </div>

                  {/* Right / Metadata & Context Column */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Details & Metadata Grid */}
                    <div>
                      <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2">
                        Details & Metadata
                      </h3>

                      {isModalEditMode ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-sans">
                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Location</label>
                            <input
                              type="text"
                              value={modalEntity.location || ''}
                              onChange={(e) => handleModalFieldChange('location', e.target.value)}
                              placeholder="e.g. Global"
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Language(s)</label>
                            <input
                              type="text"
                              value={modalEntity.language || modalEntity.extraFields?.['Language(s)'] || modalEntity.extraFields?.['Language'] || ''}
                              onChange={(e) => {
                                handleModalFieldChange('language', e.target.value);
                                handleModalFieldChange('extraFields', {
                                  ...(modalEntity.extraFields || {}),
                                  'Language(s)': e.target.value
                                });
                              }}
                              placeholder="e.g. English, Portuguese"
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          {/* Stage / Maturity dropdown + optional Other [fill] */}
                          <div className="sm:col-span-2">
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Stage / Maturity</label>
                            {(() => {
                              const standardStages = ['Early stage', 'Intermediate', 'Mature', 'Discontinued'];
                              const currentStage = String(modalEntity.stage || modalEntity.extraFields?.['Stage / Maturity'] || '');
                              const isOther = currentStage !== '' && !standardStages.includes(currentStage);
                              const selectedDropdownVal = isOther ? 'Other' : (standardStages.includes(currentStage) ? currentStage : '');

                              return (
                                <div className="space-y-1.5">
                                  <select
                                    value={selectedDropdownVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === 'Other') {
                                        handleModalFieldChange('stage', '');
                                        handleModalFieldChange('extraFields', {
                                          ...(modalEntity.extraFields || {}),
                                          'Stage / Maturity': ''
                                        });
                                      } else {
                                        handleModalFieldChange('stage', val);
                                        handleModalFieldChange('extraFields', {
                                          ...(modalEntity.extraFields || {}),
                                          'Stage / Maturity': val
                                        });
                                      }
                                    }}
                                    className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                                  >
                                    <option value="">Select stage...</option>
                                    <option value="Early stage">Early stage</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Mature">Mature</option>
                                    <option value="Discontinued">Discontinued</option>
                                    <option value="Other">Other [fill]</option>
                                  </select>
                                  {(selectedDropdownVal === 'Other' || isOther) && (
                                    <input
                                      type="text"
                                      value={currentStage}
                                      onChange={(e) => {
                                        handleModalFieldChange('stage', e.target.value);
                                        handleModalFieldChange('extraFields', {
                                          ...(modalEntity.extraFields || {}),
                                          'Stage / Maturity': e.target.value
                                        });
                                      }}
                                      placeholder="Specify other stage / maturity..."
                                      className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                                    />
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Year Founded</label>
                            <input
                              type="text"
                              value={String(modalEntity.extraFields?.['Year Founded'] || '')}
                              onChange={(e) => {
                                const yr = e.target.value;
                                handleModalFieldChange('extraFields', {
                                  ...(modalEntity.extraFields || {}),
                                  'Year Founded': yr
                                });
                              }}
                              placeholder="e.g. 2018"
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Reach</label>
                            <input
                              type="text"
                              value={modalEntity.extraFields?.['Reach'] || ''}
                              onChange={(e) => {
                                handleModalFieldChange('extraFields', {
                                  ...(modalEntity.extraFields || {}),
                                  'Reach': e.target.value
                                });
                              }}
                              placeholder="e.g. 10k Instagram"
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Impact Reach</label>
                            <input
                              type="text"
                              value={modalEntity.extraFields?.['Impact Reach'] || ''}
                              onChange={(e) => {
                                handleModalFieldChange('extraFields', {
                                  ...(modalEntity.extraFields || {}),
                                  'Impact Reach': e.target.value
                                });
                              }}
                              placeholder="e.g. 150 community members, 12 communities served"
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Instagram</label>
                            <input
                              type="text"
                              value={modalEntity.extraFields?.['Instagram'] || modalEntity.socialMedia?.instagram || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleModalFieldChange('extraFields', {
                                  ...(modalEntity.extraFields || {}),
                                  'Instagram': val
                                });
                                handleModalFieldChange('socialMedia', {
                                  ...(modalEntity.socialMedia || {}),
                                  instagram: val
                                });
                              }}
                              placeholder="handle or https://instagram.com/..."
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Twitter / X</label>
                            <input
                              type="text"
                              value={modalEntity.extraFields?.['Twitter/X'] || modalEntity.extraFields?.['Twitter'] || modalEntity.socialMedia?.twitter || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleModalFieldChange('extraFields', {
                                  ...(modalEntity.extraFields || {}),
                                  'Twitter/X': val,
                                  'Twitter': val
                                });
                                handleModalFieldChange('socialMedia', {
                                  ...(modalEntity.socialMedia || {}),
                                  twitter: val
                                });
                              }}
                              placeholder="handle or https://x.com/..."
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">YouTube</label>
                            <input
                              type="text"
                              value={modalEntity.extraFields?.['YouTube'] || modalEntity.socialMedia?.youtube || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleModalFieldChange('extraFields', {
                                  ...(modalEntity.extraFields || {}),
                                  'YouTube': val
                                });
                                handleModalFieldChange('socialMedia', {
                                  ...(modalEntity.socialMedia || {}),
                                  youtube: val
                                });
                              }}
                              placeholder="channel or https://youtube.com/..."
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Other Social Media</label>
                            <input
                              type="text"
                              value={modalEntity.extraFields?.['Other Social Media'] || ''}
                              onChange={(e) => {
                                handleModalFieldChange('extraFields', {
                                  ...(modalEntity.extraFields || {}),
                                  'Other Social Media': e.target.value
                                });
                              }}
                              placeholder="e.g. Substack, LinkedIn, Mastodon"
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Contact Email</label>
                            <input
                              type="text"
                              value={modalEntity.contactEmail || ''}
                              onChange={(e) => handleModalFieldChange('contactEmail', e.target.value)}
                              placeholder="email@org.org"
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] block uppercase mb-0.5">Website URL</label>
                            <input
                              type="text"
                              value={modalEntity.website || ''}
                              onChange={(e) => handleModalFieldChange('website', e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                          {modalEntity.location && (
                            <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                              <span className="font-technical text-[10px] text-[#8C877F] block uppercase">Location</span>
                              <span className="font-medium text-[#111827]">{modalEntity.location}</span>
                            </div>
                          )}
                          {(modalEntity.language || modalEntity.extraFields?.['Language(s)']) && (
                            <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                              <span className="font-technical text-[10px] text-[#8C877F] block uppercase">Language(s)</span>
                              <span className="font-medium text-[#111827]">{modalEntity.language || modalEntity.extraFields?.['Language(s)']}</span>
                            </div>
                          )}
                          {(modalEntity.stage || modalEntity.extraFields?.['Stage / Maturity']) && (
                            <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                              <span className="font-technical text-[10px] text-[#8C877F] block uppercase">Stage / Maturity</span>
                              <span className="font-medium text-[#111827]">{modalEntity.stage || modalEntity.extraFields?.['Stage / Maturity']}</span>
                            </div>
                          )}
                          {modalEntity.extraFields?.['Year Founded'] && (
                            <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                              <span className="font-technical text-[10px] text-[#8C877F] block uppercase">Year Founded</span>
                              <span className="font-medium text-[#111827]">{String(modalEntity.extraFields?.['Year Founded'])}</span>
                            </div>
                          )}
                          {modalEntity.extraFields?.['Reach'] && (
                            <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                              <span className="font-technical text-[10px] text-[#8C877F] block uppercase">Reach</span>
                              <span className="font-medium text-[#111827]">{modalEntity.extraFields?.['Reach']}</span>
                            </div>
                          )}
                          {modalEntity.extraFields?.['Impact Reach'] && (
                            <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] col-span-2">
                              <span className="font-technical text-[10px] text-[#8C877F] block uppercase">Impact Reach</span>
                              <span className="font-medium text-[#111827]">{modalEntity.extraFields?.['Impact Reach']}</span>
                            </div>
                          )}
                          {modalEntity.contactEmail && (
                            <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] truncate">
                              <span className="font-technical text-[10px] text-[#8C877F] block uppercase">Contact</span>
                              <span className="font-medium text-[#111827] truncate block">{modalEntity.contactEmail}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Archipelago Territory & Landmass Info */}
                    <div className="p-3.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-technical text-[11px] text-[#8C877F] uppercase tracking-wider flex items-center space-x-1">
                          <Globe className="w-3.5 h-3.5 text-[#5B21B6]" />
                          <span>Archipelago</span>
                        </span>
                        {isModalEditMode && (
                          <button
                            onClick={handleAutoSuggestContinent}
                            title="Auto-suggest archipelago based on entity fields & category"
                            className="font-technical text-[10px] text-[#5B21B6] hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <Wand2 className="w-3 h-3" />
                            <span>Auto-Suggest</span>
                          </button>
                        )}
                      </div>

                      {isModalEditMode ? (
                        <div>
                          <input
                            type="text"
                            value={modalEntity.continent || ''}
                            onChange={(e) => handleModalFieldChange('continent', e.target.value)}
                            placeholder="Archipelago name..."
                            className="w-full bg-white border border-[#E5E7EB] text-xs font-sans px-2.5 py-1.5 rounded-[4px] outline-none"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="font-editorial text-sm font-semibold text-[#111827]">
                            {modalEntContinent}
                          </span>
                          {onSelectContinent && (
                            <button
                              onClick={() => {
                                setIsEnlarged(false);
                                if (enlargedOnly || fullPageEmbedded) onClose();
                                onSelectEntity(null);
                                onSelectContinent(modalEntContinent);
                                const targetCont = continents.find(c => c.name === modalEntContinent || formatClusterWithNumber(c.name).toLowerCase() === formatClusterWithNumber(modalEntContinent).toLowerCase());
                                if (targetCont && onFlyToContinent) {
                                  onFlyToContinent(targetCont);
                                }
                              }}
                              className="font-technical text-[10px] text-[#5B21B6] hover:underline font-semibold cursor-pointer"
                            >
                              View Archipelago Overview →
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Other Archipelagos (placed right below Archipelago) - only shown if non-empty or in edit mode */}
                    {(isModalEditMode || getEntityOtherArchipelagos(modalEntity).length > 0) && (
                      <div className="p-3.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-technical text-[11px] text-[#8C877F] uppercase tracking-wider flex items-center space-x-1.5">
                            <Compass className="w-3.5 h-3.5 text-[#5B21B6]" />
                            <span>Other Archipelagos</span>
                          </span>
                          {isModalEditMode && (
                            <span className="font-technical text-[10px] text-[#7D8764] uppercase font-semibold">
                              Editable
                            </span>
                          )}
                        </div>

                        {isModalEditMode ? (
                          <div>
                            <input
                              type="text"
                              value={
                                modalEntity.otherArchipelagos && modalEntity.otherArchipelagos.length > 0
                                  ? modalEntity.otherArchipelagos.join(', ')
                                  : (modalEntity.extraFields?.['Other Archipelagos'] as string) || (modalEntity.categorizedFields?.['Overview']?.['Other Archipelagos'] as string) || ''
                              }
                              onChange={(e) => handleModalOtherArchipelagosChange(e.target.value)}
                              placeholder="Comma-separated other archipelagos (e.g. 4. Contemplative Education, 22. Regenerative Education)..."
                              className="w-full bg-white border border-[#E5E7EB] text-xs font-sans px-2.5 py-1.5 rounded-[4px] outline-none"
                            />
                            <span className="font-technical text-[10px] text-[#8C877F] mt-1 block">
                              Comma-separated archipelagos this entity is affiliated with in addition to primary.
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {getEntityOtherArchipelagos(modalEntity).map(archName => (
                              <button
                                key={archName}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectArchipelagoFromOverview(archName);
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-[#FAF8F5] border border-[#5B21B6]/30 hover:border-[#5B21B6] text-[#5B21B6] rounded-[4px] font-sans text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer group text-left"
                                title={`Click to show all entities in "${archName}" on map and right sidebar`}
                              >
                                <Globe className="w-3 h-3 text-[#5B21B6] shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="font-medium select-text">{archName}</span>
                                <span className="text-[10px] text-[#5B21B6]/60 group-hover:text-[#5B21B6] ml-0.5">→</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Our Relationship (hidden in contribution mode per 4.c) */}
                    {!isContributing && (
                      <div className="p-3.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-technical text-[11px] text-[#8C877F] uppercase tracking-wider flex items-center space-x-1.5">
                            <span className="text-xs">🤝</span>
                            <span>Our Relationship</span>
                          </span>
                          {isModalEditMode && (
                            <span className="font-technical text-[10px] text-[#7D8764] uppercase font-semibold">
                              Editable
                            </span>
                          )}
                        </div>

                        {isModalEditMode ? (
                          <div>
                            <input
                              type="text"
                              value={modalEntity.ourRelationship || modalEntity.categorizedFields?.['Overview']?.['Our Relationship'] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleModalFieldChange('ourRelationship', val);
                                const updatedCategorized = {
                                  ...(modalEntity.categorizedFields || {}),
                                  Overview: {
                                    ...((modalEntity.categorizedFields && modalEntity.categorizedFields['Overview']) || {}),
                                    'Our Relationship': val
                                  }
                                };
                                handleModalUpdateEntity({
                                  ...modalEntity,
                                  ourRelationship: val,
                                  categorizedFields: updatedCategorized
                                });
                              }}
                              placeholder="Relationship with entity..."
                              className="w-full bg-white border border-[#E5E7EB] text-xs font-sans px-2.5 py-1.5 rounded-[4px] outline-none"
                            />
                          </div>
                        ) : (
                          <div>
                            {(() => {
                              const rawRel = modalEntity.ourRelationship || modalEntity.categorizedFields?.['Overview']?.['Our Relationship'] || (modalEntity.extraFields?.['Our Relationship'] as string);
                              if (!rawRel || !String(rawRel).trim()) {
                                return (
                                  <span className="font-sans text-xs text-[#8C877F] italic font-normal">
                                    None specified
                                  </span>
                                );
                              }
                              const relItems = splitRelationshipValues(String(rawRel));
                              if (relItems.length === 0) {
                                return (
                                  <span className="font-sans text-xs text-[#8C877F] italic font-normal">
                                    None specified
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  {relItems.map((relItem, rIdx) => (
                                    <button
                                      key={rIdx}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isEnlarged) setIsEnlarged(false);
                                        if (enlargedOnly || fullPageEmbedded) onClose();
                                        if (onSelectRelationshipList) {
                                          onSelectRelationshipList(relItem);
                                        }
                                      }}
                                      className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-white hover:bg-[#F0FDF4] border border-[#BBF7D0] hover:border-[#15803D] text-[#15803D] rounded-[4px] font-sans text-xs font-semibold shadow-2xs hover:shadow-xs hover:scale-[1.01] transition-all cursor-pointer group text-left"
                                      title={`Click to show all entities with relationship "${relItem}" on map and right sidebar`}
                                    >
                                      <span className="text-xs shrink-0 select-none">🤝</span>
                                      <span className="font-medium select-text">{relItem}</span>
                                      <span className="text-[10px] text-[#15803D]/60 group-hover:text-[#15803D] group-hover:translate-x-0.5 transition-all ml-0.5">→</span>
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Map Coordinates (only in edit mode, hidden in contribution mode per 4.c) */}
                    {editMode && !isContributing && (
                      <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-technical text-[11px] text-[#8C877F] uppercase tracking-wider flex items-center space-x-1">
                            <Map className="w-3.5 h-3.5 text-[#4FC1E0]" />
                            <span>Map Position</span>
                          </span>
                        </div>
                        <div className="font-technical text-xs text-[#111827]">
                          X: <span className="font-semibold text-[#5B21B6]">{Math.round(modalEntity.x)}</span>, Y: <span className="font-semibold text-[#5B21B6]">{Math.round(modalEntity.y)}</span>
                        </div>
                      </div>
                    )}

                    {/* Categorized Ecosystem Fields (excluding Worldview & Change Orientation which moved to the Left Column) */}
                    <CategorizedFieldsSection
                      entity={modalEntity}
                      editMode={isModalEditMode}
                      isContributing={isContributing}
                      onUpdateEntity={handleModalUpdateEntity}
                      isEnlarged={true}
                      allEntities={allEntities}
                      onSelectEntity={onSelectEntity}
                      onSelectUnmappedNode={setUnmappedPopupEntity}
                      excludeCategories={['Worldview & Change Orientation']}
                      onSelectCategory={handleSelectCategoryFromOverview}
                      onSelectArchipelago={handleSelectArchipelagoFromOverview}
                      onSelectTag={handleSelectTagFromOverview}
                      onSelectRelationship={(rel) => {
                        if (isEnlarged) setIsEnlarged(false);
                        if (enlargedOnly || fullPageEmbedded) onClose();
                        onSelectRelationshipList?.(rel);
                      }}
                    />
                  </div>
                </div>

                {/* Submit Changes Section when in Community Improvement Mode */}
                {isContributing && (
                  <div className="pt-6 border-t-2 border-[#111827]/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#FAF8F5] p-5 rounded-[8px] border border-[#E5E7EB] mt-4">
                    <div>
                      <h4 className="font-editorial text-base font-bold text-[#111827]">
                        Finished improving this entry?
                      </h4>
                      <p className="font-sans text-xs text-[#6B7280]">
                        Your edits will be saved and sent for review before being merged into the live map.
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <button
                        type="button"
                        onClick={handleCancelContribution}
                        className="px-4 py-2 border border-[#E5E7EB] hover:bg-white text-[#4B5563] text-xs font-sans rounded-[4px] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        id="submit-changes-btn"
                        onClick={() => {
                          setEmailError(null);
                          setIsEmailModalOpen(true);
                        }}
                        className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-white rounded-[5px] text-xs font-technical font-semibold shadow-xs transition-all cursor-pointer group"
                      >
                        <span>Submit changes</span>
                        <span className="text-[#D9C01B] font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          );

          if (fullPageEmbedded) {
            return (
              <div
                id="enlarged-entity-focus-modal"
                className="w-full h-full bg-white flex flex-col overflow-hidden relative select-text"
                onClick={(e) => e.stopPropagation()}
              >
                {enlargedInnerContent}
              </div>
            );
          }

          return (
            <AnimatePresence>
              {isEnlarged && (
                <div
                  id="enlarged-entity-focus-overlay"
                  className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10 bg-[#111827]/60 backdrop-blur-xs select-text"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      if (enlargedOnly) {
                        onClose();
                      } else {
                        setIsEnlarged(false);
                      }
                    }
                  }}
                >
                  <motion.div
                    id="enlarged-entity-focus-modal"
                    initial={{ opacity: 0, scale: 0.92, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 16 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden relative select-text"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {enlargedInnerContent}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          );
        })()}

      {/* Email Input Modal when submitting proposed changes */}
      {isEmailModalOpen && (
        <div 
          className="fixed inset-0 z-90 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-text"
          onClick={() => setIsEmailModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-[#E5E7EB] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🌱</span>
                <h3 className="font-editorial text-lg font-bold text-[#111827]">Submit Changes</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="text-[#8C877F] hover:text-[#111827] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-technical uppercase font-bold text-[#111827] mb-1">
                  Your Email:
                </label>
                <p className="text-xs text-[#6B7280] font-sans mb-2 leading-relaxed">
                  (Your email will not be displayed publicly. It's used only if we need to contact you about your submission.)
                </p>
                <input
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => {
                    setSubmitterEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="name@example.org"
                  className="w-full bg-[#FAF8F5] border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans px-3.5 py-2.5 rounded-[4px] outline-none text-[#111827]"
                  autoFocus
                  required
                />
                {emailError && (
                  <p className="text-xs text-[#DC2626] font-sans mt-1.5 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{emailError}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={isSubmittingContribution}
                  className="px-4 py-2 border border-[#E5E7EB] hover:bg-[#FAF8F5] text-[#4B5563] text-xs font-sans rounded-[4px] cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-submit-contribution-btn"
                  disabled={isSubmittingContribution}
                  className="px-5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white text-xs font-technical font-semibold rounded-[4px] shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSubmittingContribution ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution Received Confirmation Modal */}
      {isSuccessModalOpen && (
        <div 
          className="fixed inset-0 z-90 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-text"
          onClick={handleCloseSuccessModal}
        >
          <div 
            className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-[#E5E7EB] p-6 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center mx-auto text-2xl">
              🌿
            </div>

            <div className="space-y-2">
              <h3 className="font-editorial text-xl font-bold text-[#111827]">
                Thank You!
              </h3>
              <p className="font-sans text-sm text-[#374151] leading-relaxed">
                Your contribution has been sent for review. Thank you for tending to this map with us!
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="close-success-contribution-btn"
                onClick={handleCloseSuccessModal}
                className="w-full py-2.5 px-4 bg-[#111827] hover:bg-[#1F2937] text-white text-xs font-technical font-semibold rounded-[4px] shadow-2xs cursor-pointer transition-all"
              >
                Continue Exploring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unmapped Entity Alert Pop-up Modal */}
      {unmappedPopupEntity && (
        <div 
          className="fixed inset-0 z-80 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setUnmappedPopupEntity(null)}
        >
          <div 
            className="bg-white border border-[#E5E7EB] rounded-[6px] max-w-sm w-full p-5 shadow-2xl relative select-text"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0 border border-[#FDE68A]">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-editorial text-base font-bold text-[#111827] truncate">
                  {unmappedPopupEntity}
                </h4>
                <p className="font-sans text-xs text-[#B45309] font-medium mt-0.5">
                  This entity doesn't exist on this map yet
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUnmappedPopupEntity(null)}
                className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="font-sans text-xs text-[#4B5563] bg-[#FAF8F5] p-3 rounded-[4px] border border-[#E5E7EB] mb-4 leading-relaxed">
              This entity or institution is referenced in the relationship connections (Founders, Partners, Funders, Teachers, or Collaborators), but has not yet been added as an individual mapped node in the ecosystem.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setUnmappedPopupEntity(null)}
                className="px-4 py-1.5 bg-[#111827] hover:bg-[#20293a] text-white text-xs font-sans font-medium rounded-[4px] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
