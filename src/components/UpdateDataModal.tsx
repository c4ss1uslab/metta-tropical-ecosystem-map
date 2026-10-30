import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  PlusCircle,
  SlidersHorizontal,
  ArrowRight,
  Database,
  Layers,
  Sparkles
} from 'lucide-react';
import { EcosystemEntity, SyncResult, SyncMode } from '../types';
import {
  parseFileToEntities,
  remapRowsToEntities,
  ParsedSpreadsheetResult
} from '../utils/excelParser';
import {
  HeaderParsingRule,
  HeaderAnalysisResult,
  analyzeSpreadsheetHeaders,
  saveStoredParsingRules
} from '../utils/parsingRules';
import { syncDatasets } from '../utils/syncEngine';
import { registerColumnComments } from '../utils/columnComments';
import { HeaderVerificationPanel } from './HeaderVerificationPanel';

interface UpdateDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEntities: EcosystemEntity[];
  onApplySync: (updatedEntities: EcosystemEntity[], result: SyncResult, columnComments?: Record<string, string>) => void;
}

type ModalStep = 'upload' | 'verify_headers' | 'sync_preview';

export const UpdateDataModal: React.FC<UpdateDataModalProps> = ({
  isOpen,
  onClose,
  currentEntities,
  onApplySync
}) => {
  const [modalStep, setModalStep] = useState<ModalStep>('upload');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedSpreadsheetResult | null>(null);
  const [activeRules, setActiveRules] = useState<HeaderParsingRule[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<HeaderAnalysisResult | null>(null);
  const [parsedIncoming, setParsedIncoming] = useState<EcosystemEntity[] | null>(null);
  const [parsedColumnComments, setParsedColumnComments] = useState<Record<string, string> | null>(null);
  const [syncMode, setSyncMode] = useState<SyncMode>('replace'); // Default to 'replace'
  const [preserveCoordinates, setPreserveCoordinates] = useState<boolean>(true); // Default to true so existing positions are preserved
  const [syncDiff, setSyncDiff] = useState<{ updatedDataset: EcosystemEntity[]; result: SyncResult } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recalculateDiff = (
    incoming: EcosystemEntity[],
    mode: SyncMode,
    preserveCoords: boolean
  ) => {
    const diff = syncDatasets(currentEntities, incoming, {
      mode,
      preserveCoordinates: preserveCoords
    });
    setSyncDiff(diff);
  };

  const handleModeChange = (newMode: SyncMode) => {
    setSyncMode(newMode);
    if (parsedIncoming) {
      recalculateDiff(parsedIncoming, newMode, preserveCoordinates);
    }
  };

  const handleTogglePreserveCoordinates = (val: boolean) => {
    setPreserveCoordinates(val);
    if (parsedIncoming) {
      recalculateDiff(parsedIncoming, syncMode, val);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setErrorMsg(null);
    setLoading(true);

    try {
      const result = await parseFileToEntities(file);
      setParsedResult(result);
      setActiveRules(result.analysis.rules);
      setCurrentAnalysis(result.analysis);

      if (result.columnComments && Object.keys(result.columnComments).length > 0) {
        registerColumnComments(result.columnComments);
        setParsedColumnComments(result.columnComments);
      } else {
        setParsedColumnComments(null);
      }

      if (result.entities.length === 0) {
        setErrorMsg('No valid rows or data found in spreadsheet.');
        setParsedIncoming(null);
        setSyncDiff(null);
        setLoading(false);
        return;
      }

      setParsedIncoming(result.entities);
      recalculateDiff(result.entities, syncMode, preserveCoordinates);

      // If header analysis detected rearranged columns, new fields, suggested matches, or missing fields:
      // Prompt user with the verification panel!
      if (result.analysis.hasChanges || result.analysis.needsVerification) {
        setModalStep('verify_headers');
      } else {
        setModalStep('sync_preview');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse spreadsheet file.');
      setParsedIncoming(null);
      setSyncDiff(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRule = (updatedRule: HeaderParsingRule) => {
    setActiveRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
  };

  const handleUpdateAllRules = (updatedRules: HeaderParsingRule[]) => {
    setActiveRules(updatedRules);
  };

  const handleResetRules = () => {
    if (!parsedResult) return;
    const freshAnalysis = analyzeSpreadsheetHeaders(parsedResult.rawHeaders, parsedResult.rawRows.slice(0, 10));
    setActiveRules(freshAnalysis.rules);
    setCurrentAnalysis(freshAnalysis);
  };

  const handleConfirmRules = (rememberRules: boolean) => {
    if (!parsedResult) return;

    if (rememberRules) {
      saveStoredParsingRules(activeRules);
    }

    // Re-map raw rows with the customized parsing rules
    const remappedEntities = remapRowsToEntities(
      parsedResult.rawRows,
      parsedResult.rawHeaders,
      activeRules
    );

    // Re-analyze for stats
    const updatedAnalysis = analyzeSpreadsheetHeaders(
      parsedResult.rawHeaders,
      parsedResult.rawRows.slice(0, 10),
      activeRules
    );

    setCurrentAnalysis(updatedAnalysis);
    setParsedIncoming(remappedEntities);
    recalculateDiff(remappedEntities, syncMode, preserveCoordinates);
    setModalStep('sync_preview');
  };

  const handleCancelRules = () => {
    if (parsedIncoming && parsedIncoming.length > 0) {
      setModalStep('sync_preview');
    } else {
      setModalStep('upload');
    }
  };

  const handleConfirmSync = () => {
    if (!syncDiff) return;
    onApplySync(syncDiff.updatedDataset, syncDiff.result, parsedColumnComments || undefined);
    handleResetModal();
    onClose();
  };

  const handleResetModal = () => {
    setSelectedFile(null);
    setParsedResult(null);
    setActiveRules([]);
    setCurrentAnalysis(null);
    setParsedIncoming(null);
    setSyncDiff(null);
    setErrorMsg(null);
    setModalStep('upload');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className={`bg-white border border-[#E5E7EB] rounded-[4px] w-full transition-all duration-200 shadow-2xl overflow-hidden flex flex-col my-auto ${
        modalStep === 'verify_headers'
          ? 'max-w-4xl max-h-[94vh]'
          : 'max-w-xl max-h-[92vh]'
      }`}>
        {/* Modal Header */}
        <div className="p-4 bg-[#FAF8F5] border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-[#7D8764]" />
            <div>
              <h2 className="font-editorial text-lg sm:text-xl font-semibold text-[#111827]">
                {modalStep === 'verify_headers'
                  ? 'Verify Spreadsheet Headers & Parsing Rules'
                  : 'Update & Sync Ecosystem Data'}
              </h2>
              {selectedFile && (
                <div className="font-technical text-[11px] text-[#8C877F] flex items-center space-x-2 mt-0.5">
                  <span className="truncate max-w-[280px]">{selectedFile.name}</span>
                  <span>•</span>
                  <span>{modalStep === 'verify_headers' ? 'Step 2: Confirm Rules' : modalStep === 'sync_preview' ? 'Step 3: Preview Sync' : 'Step 1: Upload'}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              handleResetModal();
              onClose();
            }}
            className="p-1 text-[#8C877F] hover:text-[#111827] rounded-[4px] transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {modalStep === 'verify_headers' && currentAnalysis ? (
          <div className="overflow-y-auto flex-1">
            <HeaderVerificationPanel
              analysis={currentAnalysis}
              rules={activeRules}
              onUpdateRule={handleUpdateRule}
              onUpdateAllRules={handleUpdateAllRules}
              onResetRules={handleResetRules}
              onConfirmRules={handleConfirmRules}
              onCancel={handleCancelRules}
              fileName={selectedFile?.name}
            />
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            <p className="font-sans text-xs text-[#4B5563] leading-relaxed">
              Upload an updated spreadsheet (<code className="font-technical text-[11px] bg-[#FAF8F5] px-1 py-0.5 border">.xlsx</code> or <code className="font-technical text-[11px] bg-[#FAF8F5] px-1 py-0.5 border">.csv</code>). The engine automatically inspects headers, detects rearranged columns or new fields, and parses data into the ecosystem.
            </p>

            {/* Sync Mode Selection */}
            <div className="space-y-2">
              <label className="block font-editorial text-sm font-semibold text-[#111827]">
                Select Sync Option:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Replace Existing Data (Default) */}
                <button
                  type="button"
                  onClick={() => handleModeChange('replace')}
                  className={`text-left p-3.5 rounded-[4px] border transition-all flex flex-col justify-between ${
                    syncMode === 'replace'
                      ? 'border-[#111827] bg-[#FAF8F5] ring-1 ring-[#111827]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#8C877F] hover:bg-[#FAF8F5]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <RotateCcw className={`w-4 h-4 ${syncMode === 'replace' ? 'text-[#111827]' : 'text-[#8C877F]'}`} />
                        <span className="font-editorial text-sm font-bold text-[#111827]">
                          Replace Existing Data
                        </span>
                      </div>
                      <span className="font-technical text-[10px] bg-[#D9C01B] text-[#111827] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Default
                      </span>
                    </div>
                    <p className="font-sans text-xs text-[#4B5563] leading-relaxed">
                      Replaces the active map with the uploaded file. Only entities from this spreadsheet will appear on the map.
                    </p>
                  </div>

                  {syncMode === 'replace' && (
                    <div className="mt-3 pt-2.5 border-t border-[#E5E7EB]">
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-start space-x-2 text-[11px] font-sans text-[#111827] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={preserveCoordinates}
                          onChange={(e) => handleTogglePreserveCoordinates(e.target.checked)}
                          className="rounded border-[#E5E7EB] text-[#111827] focus:ring-[#111827] mt-0.5"
                        />
                        <span className="leading-tight">
                          Preserve current map coordinates for matching items{' '}
                          <span className="text-[#8C877F] block text-[10px] mt-0.5">
                            (Recommended: keeps current entity positions and archipelago locations exactly as they are)
                          </span>
                        </span>
                      </label>
                    </div>
                  )}
                </button>

                {/* Option 2: Add to Existing Data (Append) */}
                <button
                  type="button"
                  onClick={() => handleModeChange('append')}
                  className={`text-left p-3.5 rounded-[4px] border transition-all flex flex-col justify-between ${
                    syncMode === 'append'
                      ? 'border-[#7D8764] bg-[#FAF8F5] ring-1 ring-[#7D8764]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#8C877F] hover:bg-[#FAF8F5]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <PlusCircle className={`w-4 h-4 ${syncMode === 'append' ? 'text-[#7D8764]' : 'text-[#8C877F]'}`} />
                        <span className="font-editorial text-sm font-bold text-[#111827]">
                          Add to Existing Data
                        </span>
                      </div>
                      <span className="font-technical text-[10px] bg-[#E5E7EB] text-[#4B5563] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">
                        Append
                      </span>
                    </div>
                    <p className="font-sans text-xs text-[#4B5563] leading-relaxed">
                      Keeps all {currentEntities.length} current map entities and adds newly discovered rows as additional nodes. Matching items are updated.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Drag & Drop File Area */}
            <div className="border-2 border-dashed border-[#E5E7EB] hover:border-[#111827] bg-[#FAF8F5] p-6 rounded-[4px] text-center transition-all relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Upload className="w-8 h-8 text-[#7D8764] mx-auto mb-2" />
              <div className="font-editorial text-base font-semibold text-[#111827]">
                {selectedFile ? selectedFile.name : 'Click or drop updated spreadsheet here'}
              </div>
              <div className="font-technical text-xs text-[#8C877F] mt-1">
                Supports Excel (.xlsx) and CSV files
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center space-x-2 text-xs font-sans text-[#111827] py-4 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                <RefreshCw className="w-4 h-4 animate-spin text-[#7D8764]" />
                <span>Checking column headers, analyzing delta & mapping positions...</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-[#AD2831]/10 border border-[#AD2831] text-[#AD2831] text-xs font-sans rounded-[4px] flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Header Rules Banner & Customize Button */}
            {currentAnalysis && (
              <div className="p-3.5 bg-white border border-[#E5E7EB] rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#7D8764]" />
                    <span className="font-editorial text-xs font-bold text-[#111827]">
                      Spreadsheet Column Header Check
                    </span>
                    {currentAnalysis.hasChanges ? (
                      <span className="font-technical text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                        Changes Detected
                      </span>
                    ) : (
                      <span className="font-technical text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                        Schema Verified
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5 text-[11px] font-technical">
                    <span className="bg-[#FAF8F5] border border-[#E5E7EB] px-2 py-0.5 rounded text-[#111827]">
                      {currentAnalysis.totalHeaders} Total Columns
                    </span>
                    {currentAnalysis.rearrangedCount > 0 && (
                      <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-amber-800 font-medium">
                        ⇄ {currentAnalysis.rearrangedCount} Rearranged
                      </span>
                    )}
                    {currentAnalysis.newFieldsCount > 0 && (
                      <span className="bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-sky-800 font-medium">
                        + {currentAnalysis.newFieldsCount} New Fields
                      </span>
                    )}
                    {currentAnalysis.suggestedMatchCount > 0 && (
                      <span className="bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-purple-800 font-medium">
                        ✦ {currentAnalysis.suggestedMatchCount} Suggestions
                      </span>
                    )}
                    <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-emerald-800 font-medium">
                      ✓ {currentAnalysis.matchedCount} Canonical Matched
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalStep('verify_headers')}
                  className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#D1D5DB] text-[#111827] text-xs font-sans font-medium rounded-[4px] flex items-center justify-center space-x-1.5 shrink-0 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#7D8764]" />
                  <span>Review / Edit Rules</span>
                </button>
              </div>
            )}

            {/* Sync Diff Preview */}
            {syncDiff && (
              <div className="space-y-3 p-4 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-editorial text-sm font-semibold text-[#111827]">
                      Sync Analysis
                    </span>
                    <span className={`font-technical text-[10px] px-2 py-0.5 rounded-[2px] font-medium ${
                      syncMode === 'replace'
                        ? 'bg-[#111827] text-white'
                        : 'bg-[#7D8764] text-white'
                    }`}>
                      {syncMode === 'replace' ? 'Mode: Replace Existing Data' : 'Mode: Add to Existing Data'}
                    </span>
                  </div>
                  <span className="font-technical text-xs bg-[#D9C01B] text-[#111827] px-2 py-0.5 rounded-[2px] font-medium">
                    Ready to Sync
                  </span>
                </div>

                {syncMode === 'replace' ? (
                  <>
                    <div className="p-2.5 bg-amber-500/10 border border-amber-300 text-amber-900 text-xs font-sans rounded-[3px] flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        The active map will be <strong>replaced</strong> with the <strong>{syncDiff.result.totalNew}</strong> entities from this spreadsheet.
                        {syncDiff.result.removed && syncDiff.result.removed.length > 0 && (
                          <> ({syncDiff.result.removed.length} previous entities not in this file will be replaced).</>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-technical text-xs">
                      <div className="p-2 bg-white border border-[#E5E7EB] rounded-[2px]">
                        <span className="text-[#8C877F] block uppercase text-[10px]">Total New Map Nodes</span>
                        <span className="text-[#111827] font-bold text-base">{syncDiff.result.totalNew}</span>
                      </div>

                      <div className="p-2 bg-white border border-[#E5E7EB] rounded-[2px]">
                        <span className="text-[#8C877F] block uppercase text-[10px]">Matching Updated</span>
                        <span className="text-[#4FC1E0] font-bold text-base">{syncDiff.result.updated.length}</span>
                      </div>

                      <div className="p-2 bg-white border border-[#E5E7EB] rounded-[2px]">
                        <span className="text-[#8C877F] block uppercase text-[10px]">Preserved Positions</span>
                        <span className="text-[#5B21B6] font-bold text-base">{syncDiff.result.preservedCoordinatesCount}</span>
                      </div>

                      <div className="p-2 bg-white border border-[#E5E7EB] rounded-[2px]">
                        <span className="text-[#8C877F] block uppercase text-[10px]">Old Nodes Replaced</span>
                        <span className="text-[#AD2831] font-bold text-base">-{syncDiff.result.removed?.length || 0}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-300 text-emerald-900 text-xs font-sans rounded-[3px] flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        Adding <strong>+{syncDiff.result.added.length}</strong> new entities to your existing <strong>{currentEntities.length}</strong> nodes (total <strong>{syncDiff.result.totalNew}</strong>).
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-technical text-xs">
                      <div className="p-2 bg-white border border-[#E5E7EB] rounded-[2px]">
                        <span className="text-[#8C877F] block uppercase text-[10px]">New Entries Added</span>
                        <span className="text-[#7D8764] font-bold text-base">+{syncDiff.result.added.length}</span>
                      </div>

                      <div className="p-2 bg-white border border-[#E5E7EB] rounded-[2px]">
                        <span className="text-[#8C877F] block uppercase text-[10px]">Matching Updated</span>
                        <span className="text-[#4FC1E0] font-bold text-base">{syncDiff.result.updated.length}</span>
                      </div>

                      <div className="p-2 bg-white border border-[#E5E7EB] rounded-[2px]">
                        <span className="text-[#8C877F] block uppercase text-[10px]">Preserved Positions</span>
                        <span className="text-[#5B21B6] font-bold text-base">{syncDiff.result.preservedCoordinatesCount}</span>
                      </div>

                      <div className="p-2 bg-white border border-[#E5E7EB] rounded-[2px]">
                        <span className="text-[#8C877F] block uppercase text-[10px]">Total Combined Nodes</span>
                        <span className="text-[#111827] font-bold text-base">{syncDiff.result.totalNew}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Sample New/Updated */}
                {syncDiff.result.added.length > 0 && (
                  <div className="mt-2 text-xs font-sans">
                    <span className="font-semibold text-[#111827] block mb-1">
                      {syncMode === 'replace' ? 'Detected Entities in File:' : 'Newly Added Entities:'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {syncDiff.result.added.slice(0, 5).map((e, idx) => (
                        <span key={e.id || `added-${idx}`} className="bg-white border border-[#E5E7EB] px-2 py-0.5 rounded-[2px] font-technical text-[10px]">
                          + {e.name} ({e.category})
                        </span>
                      ))}
                      {syncDiff.result.added.length > 5 && (
                        <span className="text-[#8C877F] text-[10px] self-center">
                          +{syncDiff.result.added.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer (for upload and sync_preview steps) */}
        {modalStep !== 'verify_headers' && (
          <div className="p-4 bg-[#FAF8F5] border-t border-[#E5E7EB] flex items-center justify-between shrink-0">
            <div>
              {selectedFile && currentAnalysis && (
                <button
                  type="button"
                  onClick={() => setModalStep('verify_headers')}
                  className="text-xs font-sans text-[#7D8764] hover:text-[#111827] underline flex items-center space-x-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Inspect Parsing Rules</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  handleResetModal();
                  onClose();
                }}
                className="px-4 py-2 border border-[#E5E7EB] bg-white text-[#111827] text-xs font-sans hover:bg-[#FAF8F5] rounded-[4px] transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!syncDiff || loading}
                onClick={handleConfirmSync}
                className={`px-5 py-2 text-xs font-sans font-medium rounded-[4px] flex items-center space-x-1.5 transition-all ${
                  syncDiff && !loading
                    ? syncMode === 'replace'
                      ? 'bg-[#111827] text-white hover:bg-[#20293a]'
                      : 'bg-[#7D8764] text-white hover:bg-[#6c7555]'
                    : 'bg-[#E5E7EB] text-[#8C877F] cursor-not-allowed'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-[#D9C01B]" />
                <span>
                  {syncMode === 'replace'
                    ? `Replace Existing Data (${syncDiff ? syncDiff.result.totalNew : 0} nodes)`
                    : `Add to Existing Data (+${syncDiff ? syncDiff.result.added.length : 0} new)`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
