import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  PlusCircle,
  EyeOff,
  Search,
  ArrowRight,
  HelpCircle,
  RefreshCw,
  Database,
  Layers,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import {
  HeaderParsingRule,
  HeaderAnalysisResult,
  ALL_CATEGORY_OPTIONS,
  ColumnAction
} from '../utils/parsingRules';
import { SPREADSHEET_COLUMNS, SPREADSHEET_CATEGORY_NAMES } from '../utils/spreadsheetSchema';

interface HeaderVerificationPanelProps {
  analysis: HeaderAnalysisResult;
  rules: HeaderParsingRule[];
  onUpdateRule: (updatedRule: HeaderParsingRule) => void;
  onUpdateAllRules: (updatedRules: HeaderParsingRule[]) => void;
  onResetRules: () => void;
  onConfirmRules: (rememberRules: boolean) => void;
  onCancel: () => void;
  fileName?: string;
}

export const HeaderVerificationPanel: React.FC<HeaderVerificationPanelProps> = ({
  analysis,
  rules,
  onUpdateRule,
  onUpdateAllRules,
  onResetRules,
  onConfirmRules,
  onCancel,
  fileName
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'attention' | 'rearranged' | 'new_fields' | 'matched'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rememberRules, setRememberRules] = useState(true);
  const [showMissingAccordion, setShowMissingAccordion] = useState(false);

  // Group canonical fields by category for the dropdown
  const canonicalFieldsByCategory = useMemo(() => {
    const map = new Map<string, string[]>();
    SPREADSHEET_CATEGORY_NAMES.forEach(cat => {
      map.set(cat, []);
    });
    SPREADSHEET_COLUMNS.forEach(c => {
      if (!map.has(c.category)) {
        map.set(c.category, []);
      }
      map.get(c.category)!.push(c.field);
    });
    return map;
  }, []);

  // Compute live stats from current rules
  const stats = useMemo(() => {
    let matched = 0;
    let rearranged = 0;
    let newFields = 0;
    let suggested = 0;
    let ignored = 0;

    rules.forEach(r => {
      if (r.action === 'ignore') {
        ignored++;
      } else if (r.action === 'add_new_field' || r.isCustomField) {
        newFields++;
      } else if (r.status === 'rearranged') {
        rearranged++;
      } else if (r.status === 'suggested_match') {
        suggested++;
      } else {
        matched++;
      }
    });

    const attentionCount = rearranged + newFields + suggested + ignored;
    return {
      total: rules.length,
      matched,
      rearranged,
      newFields,
      suggested,
      ignored,
      attentionCount
    };
  }, [rules]);

  // Set default tab to 'attention' if there are changes
  React.useEffect(() => {
    if (stats.attentionCount > 0 && filterTab === 'all') {
      setFilterTab('attention');
    }
  }, []);

  // Filtered rules for display
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      // Tab filter
      if (filterTab === 'attention') {
        const isAttention = r.status === 'rearranged' || r.status === 'new_field' || r.status === 'suggested_match' || r.action === 'ignore';
        if (!isAttention) return false;
      } else if (filterTab === 'rearranged') {
        if (r.status !== 'rearranged') return false;
      } else if (filterTab === 'new_fields') {
        if (r.action !== 'add_new_field' && !r.isCustomField) return false;
      } else if (filterTab === 'matched') {
        if (r.status !== 'matched' && r.action !== 'map_existing') return false;
        if (r.status === 'rearranged' || r.status === 'suggested_match') return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesHeader = r.sourceHeader.toLowerCase().includes(q);
        const matchesTarget = r.targetField.toLowerCase().includes(q);
        const matchesLetter = r.sourceLetter.toLowerCase().includes(q);
        const matchesCategory = r.category.toLowerCase().includes(q);
        const matchesSamples = (r.sampleValues || []).some(s => s.toLowerCase().includes(q));
        if (!matchesHeader && !matchesTarget && !matchesLetter && !matchesCategory && !matchesSamples) {
          return false;
        }
      }

      return true;
    });
  }, [rules, filterTab, searchQuery, stats.attentionCount]);

  const handleActionChange = (rule: HeaderParsingRule, newAction: ColumnAction) => {
    const updated: HeaderParsingRule = {
      ...rule,
      action: newAction
    };

    if (newAction === 'ignore') {
      updated.status = 'ignored';
    } else if (newAction === 'add_new_field') {
      updated.isCustomField = true;
      updated.status = 'new_field';
      if (!updated.category || updated.category === 'Overview') {
        updated.category = 'Additional Data';
      }
    } else if (newAction === 'map_existing') {
      const canonical = SPREADSHEET_COLUMNS.find(c => c.field.toLowerCase() === updated.targetField.toLowerCase());
      if (canonical) {
        updated.category = canonical.category;
        updated.isCustomField = false;
        updated.status = (canonical.index !== updated.sourceIndex) ? 'rearranged' : 'matched';
      }
    }

    onUpdateRule(updated);
  };

  const handleTargetFieldChange = (rule: HeaderParsingRule, newTargetField: string) => {
    const canonical = SPREADSHEET_COLUMNS.find(c => c.field === newTargetField);
    const updated: HeaderParsingRule = {
      ...rule,
      targetField: newTargetField,
      action: 'map_existing',
      isCustomField: false,
      category: canonical ? canonical.category : rule.category,
      status: canonical && canonical.index !== rule.sourceIndex ? 'rearranged' : 'matched',
      matchReason: `Manually mapped to ${newTargetField}`
    };
    onUpdateRule(updated);
  };

  const handleCategoryChange = (rule: HeaderParsingRule, newCategory: string) => {
    onUpdateRule({
      ...rule,
      category: newCategory
    });
  };

  const handleCustomFieldNameChange = (rule: HeaderParsingRule, newName: string) => {
    onUpdateRule({
      ...rule,
      targetField: newName
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5]">
      {/* Top Banner Notice */}
      <div className="p-4 bg-white border-b border-[#E5E7EB] space-y-3 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-[#7D8764]" />
              <h3 className="font-editorial text-lg font-bold text-[#111827]">
                Spreadsheet Header & Parsing Rules Check
              </h3>
            </div>
            <p className="font-sans text-xs text-[#4B5563] mt-1 leading-relaxed">
              We examined <strong className="text-[#111827]">{rules.length} columns</strong> from <code className="font-technical text-[11px] bg-[#FAF8F5] px-1 py-0.5 border">{fileName || 'your spreadsheet'}</code>.
              {stats.attentionCount > 0 ? (
                <span> We identified rearranged column positions, new fields, and suggested matches below. Verify or adapt the rules before applying sync.</span>
              ) : (
                <span> All columns match the canonical parsing rules perfectly. You can review mappings or customize them below.</span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onResetRules}
            className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-technical border border-[#E5E7EB] bg-[#FAF8F5] hover:bg-white text-[#4B5563] hover:text-[#111827] rounded-[3px] transition-colors"
            title="Reset all mappings to initial auto-detected states"
          >
            <RefreshCw className="w-3 h-3 text-[#8C877F]" />
            <span>Reset Rules</span>
          </button>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-technical text-xs">
          <div className="p-2 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[3px] flex flex-col justify-between">
            <span className="text-[#8C877F] uppercase text-[10px]">Total Columns</span>
            <span className="text-[#111827] font-bold text-base mt-0.5">{stats.total}</span>
          </div>

          <div className={`p-2 border rounded-[3px] flex flex-col justify-between ${
            stats.rearranged > 0 ? 'bg-amber-500/10 border-amber-300' : 'bg-[#FAF8F5] border-[#E5E7EB]'
          }`}>
            <span className="text-[#8C877F] uppercase text-[10px] flex items-center justify-between">
              <span>Rearranged</span>
              {stats.rearranged > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" />}
            </span>
            <span className={`font-bold text-base mt-0.5 ${stats.rearranged > 0 ? 'text-amber-800' : 'text-[#111827]'}`}>
              {stats.rearranged}
            </span>
          </div>

          <div className={`p-2 border rounded-[3px] flex flex-col justify-between ${
            stats.newFields > 0 ? 'bg-emerald-500/10 border-emerald-300' : 'bg-[#FAF8F5] border-[#E5E7EB]'
          }`}>
            <span className="text-[#8C877F] uppercase text-[10px] flex items-center justify-between">
              <span>New Fields</span>
              {stats.newFields > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </span>
            <span className={`font-bold text-base mt-0.5 ${stats.newFields > 0 ? 'text-emerald-800' : 'text-[#111827]'}`}>
              +{stats.newFields}
            </span>
          </div>

          <div className={`p-2 border rounded-[3px] flex flex-col justify-between ${
            stats.suggested > 0 ? 'bg-purple-500/10 border-purple-300' : 'bg-[#FAF8F5] border-[#E5E7EB]'
          }`}>
            <span className="text-[#8C877F] uppercase text-[10px] flex items-center justify-between">
              <span>Suggested Matches</span>
              {stats.suggested > 0 && <span className="w-2 h-2 rounded-full bg-purple-500" />}
            </span>
            <span className={`font-bold text-base mt-0.5 ${stats.suggested > 0 ? 'text-purple-800' : 'text-[#111827]'}`}>
              {stats.suggested}
            </span>
          </div>

          <div className="p-2 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[3px] flex flex-col justify-between">
            <span className="text-[#8C877F] uppercase text-[10px]">Canonical Matched</span>
            <span className="text-[#065F46] font-bold text-base mt-0.5">{stats.matched}</span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-[#E5E7EB]">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 text-xs font-technical rounded-[3px] border transition-colors ${
                filterTab === 'all'
                  ? 'bg-[#111827] text-white border-[#111827]'
                  : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#8C877F]'
              }`}
            >
              All Columns ({stats.total})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('attention')}
              className={`px-2.5 py-1 text-xs font-technical rounded-[3px] border transition-colors flex items-center space-x-1.5 ${
                filterTab === 'attention'
                  ? 'bg-amber-600 text-white border-amber-600 font-bold'
                  : 'bg-white text-[#B45309] border-amber-200 hover:border-amber-400'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Attention Needed ({stats.attentionCount})</span>
            </button>

            {stats.rearranged > 0 && (
              <button
                type="button"
                onClick={() => setFilterTab('rearranged')}
                className={`px-2.5 py-1 text-xs font-technical rounded-[3px] border transition-colors ${
                  filterTab === 'rearranged'
                    ? 'bg-amber-700 text-white border-amber-700'
                    : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#8C877F]'
                }`}
              >
                Rearranged ({stats.rearranged})
              </button>
            )}

            {stats.newFields > 0 && (
              <button
                type="button"
                onClick={() => setFilterTab('new_fields')}
                className={`px-2.5 py-1 text-xs font-technical rounded-[3px] border transition-colors ${
                  filterTab === 'new_fields'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#8C877F]'
                }`}
              >
                New Fields ({stats.newFields})
              </button>
            )}

            <button
              type="button"
              onClick={() => setFilterTab('matched')}
              className={`px-2.5 py-1 text-xs font-technical rounded-[3px] border transition-colors ${
                filterTab === 'matched'
                  ? 'bg-[#7D8764] text-white border-[#7D8764]'
                  : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#8C877F]'
              }`}
            >
              Matched ({stats.matched})
            </button>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans pl-8 pr-3 py-1 rounded-[3px] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main List of Header Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filteredRules.length === 0 ? (
          <div className="text-center py-10 bg-white border border-[#E5E7EB] rounded-[4px] p-6">
            <Info className="w-8 h-8 text-[#8C877F] mx-auto mb-2 opacity-60" />
            <p className="font-editorial text-sm font-semibold text-[#111827]">
              No columns match the current filter.
            </p>
            <p className="font-sans text-xs text-[#8C877F] mt-1">
              Try switching tabs to &quot;All Columns&quot; or clearing your search query.
            </p>
          </div>
        ) : (
          filteredRules.map((rule) => {
            const isRearranged = rule.status === 'rearranged';
            const isNewField = rule.action === 'add_new_field' || rule.isCustomField;
            const isSuggested = rule.status === 'suggested_match';
            const isIgnored = rule.action === 'ignore';

            return (
              <div
                key={rule.id}
                className={`p-3.5 bg-white border rounded-[4px] shadow-2xs transition-all ${
                  isIgnored
                    ? 'border-[#E5E7EB] opacity-60 bg-[#FAF8F5]/60'
                    : isRearranged
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : isNewField
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : isSuggested
                    ? 'border-purple-300 ring-1 ring-purple-200'
                    : 'border-[#E5E7EB] hover:border-[#8C877F]'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Left Column Information */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-1">
                      {/* Current Column Letter & Index */}
                      <span className="font-technical text-[11px] font-bold bg-[#111827] text-white px-2 py-0.5 rounded-[2px]">
                        Col {rule.sourceLetter} (#{rule.sourceIndex})
                      </span>

                      {/* Header name in spreadsheet */}
                      <span className="font-editorial text-sm font-bold text-[#111827] truncate">
                        &ldquo;{rule.sourceHeader}&rdquo;
                      </span>

                      {/* Status Badges */}
                      {isRearranged && (
                        <span className="font-technical text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center space-x-1">
                          <ArrowRight className="w-2.5 h-2.5" />
                          <span>Moved from Col {rule.previousLetter} (#{rule.previousIndex})</span>
                        </span>
                      )}

                      {isNewField && (
                        <span className="font-technical text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center space-x-1">
                          <PlusCircle className="w-2.5 h-2.5" />
                          <span>New Field Detected</span>
                        </span>
                      )}

                      {isSuggested && (
                        <span className="font-technical text-[10px] bg-purple-100 text-purple-800 border border-purple-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center space-x-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Suggested Match ({Math.round((rule.confidence || 0) * 100)}%)</span>
                        </span>
                      )}

                      {isIgnored && (
                        <span className="font-technical text-[10px] bg-gray-100 text-gray-700 border border-gray-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center space-x-1">
                          <EyeOff className="w-2.5 h-2.5" />
                          <span>Ignored / Skipped</span>
                        </span>
                      )}

                      {!isRearranged && !isNewField && !isSuggested && !isIgnored && (
                        <span className="font-technical text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-medium flex items-center space-x-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-[#065F46]" />
                          <span>Canonical Matched</span>
                        </span>
                      )}
                    </div>

                    {/* Sample Data Preview from First Rows */}
                    {rule.sampleValues && rule.sampleValues.length > 0 ? (
                      <div className="flex items-center space-x-1.5 text-xs text-[#4B5563] mt-1 font-sans">
                        <span className="text-[#8C877F] font-technical text-[10px] uppercase shrink-0">Sample Data:</span>
                        <div className="flex flex-wrap gap-1">
                          {rule.sampleValues.map((val, sIdx) => (
                            <span
                              key={sIdx}
                              className="font-technical text-[11px] bg-[#FAF8F5] border border-[#E5E7EB] text-[#111827] px-1.5 py-0.2 rounded truncate max-w-[200px]"
                              title={val}
                            >
                              {val}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#8C877F] italic mt-0.5 block">
                        No sample data in first rows
                      </span>
                    )}

                    {/* Match reason notice */}
                    {rule.matchReason && (
                      <div className="text-[10px] text-[#8C877F] font-technical mt-1">
                        Rule context: {rule.matchReason}
                      </div>
                    )}
                  </div>

                  {/* Right Column Action Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:shrink-0 bg-[#FAF8F5] p-2.5 rounded-[3px] border border-[#E5E7EB]">
                    {/* Action Selector: Map Existing vs Add New Field vs Ignore */}
                    <div className="flex items-center space-x-1">
                      <select
                        value={rule.action}
                        onChange={(e) => handleActionChange(rule, e.target.value as ColumnAction)}
                        className="bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans px-2 py-1.5 rounded-[3px] outline-none font-medium text-[#111827]"
                      >
                        <option value="map_existing">Match Existing Field</option>
                        <option value="add_new_field">+ Add as New Field</option>
                        <option value="ignore">Ignore Column</option>
                      </select>
                    </div>

                    {/* Target Field Details according to Action */}
                    {rule.action === 'map_existing' && (
                      <div className="flex items-center space-x-1.5">
                        <select
                          value={rule.targetField}
                          onChange={(e) => handleTargetFieldChange(rule, e.target.value)}
                          className="bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans px-2 py-1.5 rounded-[3px] outline-none text-[#111827] max-w-[210px]"
                        >
                          {SPREADSHEET_CATEGORY_NAMES.map(cat => {
                            const fields = canonicalFieldsByCategory.get(cat) || [];
                            return (
                              <optgroup key={cat} label={`── ${cat} ──`}>
                                {fields.map(f => (
                                  <option key={f} value={f}>
                                    {f}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                        <span className="font-technical text-[10px] bg-[#E5E7EB] text-[#4B5563] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                          {rule.category}
                        </span>
                      </div>
                    )}

                    {rule.action === 'add_new_field' && (
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <input
                          type="text"
                          value={rule.targetField}
                          onChange={(e) => handleCustomFieldNameChange(rule, e.target.value)}
                          placeholder="New Field Name"
                          className="bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans px-2 py-1.5 rounded-[3px] outline-none text-[#111827] w-[140px]"
                        />

                        <select
                          value={rule.category}
                          onChange={(e) => handleCategoryChange(rule, e.target.value)}
                          className="bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans px-2 py-1.5 rounded-[3px] outline-none text-[#111827]"
                          title="Assign to Category"
                        >
                          {ALL_CATEGORY_OPTIONS.map(cat => (
                            <option key={cat} value={cat}>
                              Category: {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {rule.action === 'ignore' && (
                      <span className="font-technical text-[11px] text-[#8C877F] italic px-2">
                        Data from Col {rule.sourceLetter} will be skipped
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Missing Canonical Fields Accordion */}
        {analysis.missingCanonicalFields && analysis.missingCanonicalFields.length > 0 && (
          <div className="mt-4 border border-[#E5E7EB] bg-white rounded-[4px] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMissingAccordion(!showMissingAccordion)}
              className="w-full p-3 bg-[#FAF8F5] flex items-center justify-between text-left hover:bg-[#FAF8F5]/80 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-[#8C877F]" />
                <span className="font-editorial text-sm font-semibold text-[#111827]">
                  Missing Canonical Fields in File ({analysis.missingCanonicalFields.length})
                </span>
                <span className="font-technical text-[10px] text-[#8C877F]">
                  (Optional fields not present in this spreadsheet)
                </span>
              </div>
              {showMissingAccordion ? (
                <ChevronUp className="w-4 h-4 text-[#8C877F]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#8C877F]" />
              )}
            </button>

            {showMissingAccordion && (
              <div className="p-3 text-xs font-sans space-y-2 border-t border-[#E5E7EB]">
                <p className="text-[#4B5563]">
                  These standard canonical columns are not present in the uploaded spreadsheet. Default fallbacks or auto-generation will be used when applicable:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto">
                  {analysis.missingCanonicalFields.map(m => (
                    <span
                      key={m.field}
                      className="font-technical text-[11px] bg-[#FAF8F5] border border-[#E5E7EB] text-[#4B5563] px-2 py-0.5 rounded-[2px]"
                    >
                      {m.field} <span className="text-[#8C877F]">({m.category})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls & Confirmation */}
      <div className="p-4 bg-white border-t border-[#E5E7EB] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <label className="flex items-center space-x-2 text-xs font-sans text-[#111827] cursor-pointer">
          <input
            type="checkbox"
            checked={rememberRules}
            onChange={(e) => setRememberRules(e.target.checked)}
            className="rounded border-[#E5E7EB] text-[#111827] focus:ring-[#111827]"
          />
          <span>
            Remember and update parsing rules permanently for future uploads
          </span>
        </label>

        <div className="flex items-center space-x-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-[#E5E7EB] bg-white text-[#111827] text-xs font-sans hover:bg-[#FAF8F5] rounded-[4px]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => onConfirmRules(rememberRules)}
            className="px-5 py-2 bg-[#111827] text-white hover:bg-[#20293a] text-xs font-sans font-medium rounded-[4px] flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4 text-[#D9C01B]" />
            <span>
              Confirm Rules & Continue ({stats.total - stats.ignored} Columns Mapped)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
