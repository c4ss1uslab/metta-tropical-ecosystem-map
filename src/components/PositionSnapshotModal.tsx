import React, { useState, useId, useRef } from 'react';
import { X, Download, Upload, Copy, Check, FileJson, AlertCircle, RefreshCw, CheckCircle2, ShieldCheck, MapPin, Layers } from 'lucide-react';
import { EcosystemEntity, ArchipelagoMeta, LayerQuadrantConfig } from '../types';

export interface PositionSnapshot {
  version: number;
  snapshotType: 'metta-map-positions-snapshot';
  exportedAt: string;
  description: string;
  totalEntities: number;
  totalShapes: number;
  entities: Array<{
    id: string;
    name: string;
    continent?: string;
    category?: string;
    x: number;
    y: number;
    isCustomPosition?: boolean;
  }>;
  customContinentShapes?: Record<string, [number, number][]>;
  archipelagoMetadata?: Record<string, ArchipelagoMeta>;
  layerQuadrantSizes?: LayerQuadrantConfig;
}

interface PositionSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: EcosystemEntity[];
  customContinentShapes: Record<string, [number, number][]>;
  archipelagoMetadata: Record<string, ArchipelagoMeta>;
  layerQuadrantSizes: LayerQuadrantConfig;
  onApplySnapshot: (
    updatedEntities: EcosystemEntity[],
    updatedShapes?: Record<string, [number, number][]>,
    updatedMeta?: Record<string, ArchipelagoMeta>,
    updatedQuadrants?: LayerQuadrantConfig,
    commitToCloudImmediately?: boolean
  ) => void;
}

export const PositionSnapshotModal: React.FC<PositionSnapshotModalProps> = ({
  isOpen,
  onClose,
  entities,
  customContinentShapes,
  archipelagoMetadata,
  layerQuadrantSizes,
  onApplySnapshot
}) => {
  const fileInputId = useId();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copied, setCopied] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedSnapshot, setParsedSnapshot] = useState<PositionSnapshot | null>(null);
  const [importOptions, setImportOptions] = useState({
    applyEntities: true,
    applyShapes: true,
    applyMetadata: true,
    applyQuadrants: true
  });
  const [isApplying, setIsApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Generate the snapshot object from active data
  const generateSnapshot = (): PositionSnapshot => {
    return {
      version: 1,
      snapshotType: 'metta-map-positions-snapshot',
      exportedAt: new Date().toISOString(),
      description: 'Metta Tropical Ecosystem Map - Entity & Archipelago Positions Snapshot',
      totalEntities: entities.length,
      totalShapes: Object.keys(customContinentShapes).length,
      entities: entities.map(ent => ({
        id: ent.id,
        name: ent.name,
        continent: ent.continent,
        category: ent.category,
        x: ent.x,
        y: ent.y,
        isCustomPosition: (typeof ent.x === 'number' && typeof ent.y === 'number' && (ent.x !== 0 || ent.y !== 0)) ? true : Boolean(ent.isCustomPosition)
      })),
      customContinentShapes,
      archipelagoMetadata,
      layerQuadrantSizes
    };
  };

  const handleCopyJson = () => {
    const snapshot = generateSnapshot();
    const jsonStr = JSON.stringify(snapshot, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownloadJson = () => {
    const snapshot = generateSnapshot();
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metta-positions-snapshot-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const validateAndParseJson = (rawText: string) => {
    setParseError(null);
    setSuccessMessage(null);
    if (!rawText.trim()) {
      setParsedSnapshot(null);
      return;
    }

    try {
      const parsed = JSON.parse(rawText);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON: Root must be an object');
      }

      // Check if entities or positions exist in standard or alternate format
      const entityList = Array.isArray(parsed.entities)
        ? parsed.entities
        : Array.isArray(parsed)
        ? parsed
        : null;

      if (!entityList && !parsed.customContinentShapes && !parsed.shapes) {
        throw new Error('Snapshot must contain an "entities" list or "customContinentShapes"');
      }

      const normalized: PositionSnapshot = {
        version: parsed.version || 1,
        snapshotType: 'metta-map-positions-snapshot',
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        description: parsed.description || 'Imported snapshot',
        totalEntities: entityList ? entityList.length : 0,
        totalShapes: parsed.customContinentShapes ? Object.keys(parsed.customContinentShapes).length : 0,
        entities: entityList || [],
        customContinentShapes: parsed.customContinentShapes || parsed.shapes || {},
        archipelagoMetadata: parsed.archipelagoMetadata || parsed.metadata || {},
        layerQuadrantSizes: parsed.layerQuadrantSizes || parsed.quadrants
      };

      setParsedSnapshot(normalized);
    } catch (e: any) {
      setParseError(e.message || 'Failed to parse JSON file');
      setParsedSnapshot(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportJsonText(text);
      validateAndParseJson(text);
    };
    reader.readAsText(file);
  };

  const handleApply = async (commitToCloudImmediately: boolean) => {
    if (!parsedSnapshot) return;
    setIsApplying(true);

    try {
      let updatedEntities = [...entities];

      if (importOptions.applyEntities && parsedSnapshot.entities.length > 0) {
        const normalizeKey = (s?: string) => s ? s.toLowerCase().replace(/[\s\-_.,;:'"()]+/g, ' ').trim() : '';

        // Build fast lookup by ID and normalized Name
        const idMap = new Map<string, { x: number; y: number; isCustomPosition?: boolean; continent?: string; category?: string }>();
        const nameMap = new Map<string, { x: number; y: number; isCustomPosition?: boolean; continent?: string; category?: string }>();
        const normNameMap = new Map<string, { x: number; y: number; isCustomPosition?: boolean; continent?: string; category?: string }>();

        parsedSnapshot.entities.forEach(item => {
          if (item.id) idMap.set(item.id, item);
          if (item.name) {
            const clean = item.name.trim().toLowerCase();
            nameMap.set(clean, item);
            const norm = normalizeKey(item.name);
            if (norm) normNameMap.set(norm, item);
          }
        });

        updatedEntities = entities.map(currentEnt => {
          const cleanName = currentEnt.name.trim().toLowerCase();
          const normName = normalizeKey(currentEnt.name);
          const match = idMap.get(currentEnt.id) || nameMap.get(cleanName) || normNameMap.get(normName);
          if (match && typeof match.x === 'number' && typeof match.y === 'number' && Number.isFinite(match.x) && Number.isFinite(match.y)) {
            return {
              ...currentEnt,
              x: match.x,
              y: match.y,
              isCustomPosition: true, // Always lock positions strictly when restoring from snapshot
              continent: match.continent || currentEnt.continent
            };
          }
          return currentEnt;
        });
      }

      const updatedShapes = importOptions.applyShapes ? (parsedSnapshot.customContinentShapes || customContinentShapes) : customContinentShapes;
      const updatedMeta = importOptions.applyMetadata ? (parsedSnapshot.archipelagoMetadata || archipelagoMetadata) : archipelagoMetadata;
      const updatedQuadrants = importOptions.applyQuadrants ? (parsedSnapshot.layerQuadrantSizes || layerQuadrantSizes) : layerQuadrantSizes;

      onApplySnapshot(
        updatedEntities,
        updatedShapes,
        updatedMeta,
        updatedQuadrants,
        commitToCloudImmediately
      );

      setSuccessMessage(
        commitToCloudImmediately
          ? 'Snapshot successfully applied and committed to cloud!'
          : 'Snapshot applied locally to map! Review the positions, then click Commit when ready.'
      );

      setTimeout(() => {
        setIsApplying(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setParseError(err.message || 'Failed to apply snapshot');
      setIsApplying(false);
    }
  };

  // Calculate matching stats for preview
  const matchingEntitiesCount = parsedSnapshot
    ? entities.filter(e => {
        const cleanName = e.name.trim().toLowerCase();
        const normName = e.name.toLowerCase().replace(/[\s\-_.,;:'"()]+/g, ' ').trim();
        return parsedSnapshot.entities.some(item => {
          if (item.id && item.id === e.id) return true;
          if (!item.name) return false;
          const iClean = item.name.trim().toLowerCase();
          if (iClean === cleanName) return true;
          const iNorm = item.name.toLowerCase().replace(/[\s\-_.,;:'"()]+/g, ' ').trim();
          return iNorm === normName;
        });
      }).length
    : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[#111827]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#FAF8F5]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#2563EB]/10 rounded-md text-[#2563EB]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#111827]">Map Positions Snapshot</h2>
              <p className="text-xs text-[#6B7280]">
                Export or import custom coordinates for entities and archipelagos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-white rounded-md transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E5E7EB] bg-[#F9FAFB] px-6">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'export'
                ? 'border-[#2563EB] text-[#2563EB] bg-white font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Snapshot</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'import'
                ? 'border-[#2563EB] text-[#2563EB] bg-white font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import Snapshot</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'export' ? (
            /* EXPORT TAB */
            <div className="space-y-5">
              <div className="p-4 bg-[#F0FDF4] border border-[#DCFCE7] rounded-md">
                <div className="flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                  <div className="text-xs text-[#15803D] space-y-1">
                    <p className="font-semibold">Snapshot ready for backup or transfer</p>
                    <p>
                      This snapshot captures the exact (x, y) coordinates of all placed entities,
                      custom archipelago polygon borders, label offsets, and quadrant boundaries.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-md text-center">
                  <span className="block text-2xl font-bold text-[#111827]">{entities.length}</span>
                  <span className="text-[11px] text-[#6B7280] font-medium">Entities Placed</span>
                </div>
                <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-md text-center">
                  <span className="block text-2xl font-bold text-[#2563EB]">
                    {Object.keys(customContinentShapes).length}
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-medium">Archipelago Shapes</span>
                </div>
                <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-md text-center">
                  <span className="block text-2xl font-bold text-[#D97706]">
                    {Object.keys(archipelagoMetadata).length}
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-medium">Archipelago Meta</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="flex-1 flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2.5 px-4 rounded-md font-medium text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Snapshot File (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center justify-center space-x-2 bg-white hover:bg-[#FAF8F5] text-[#111827] border border-[#D1D5DB] hover:border-[#111827] py-2.5 px-4 rounded-md font-medium text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#16A34A]" />
                      <span className="text-[#16A34A]">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#6B7280]" />
                      <span>Copy JSON Text</span>
                    </>
                  )}
                </button>
              </div>

              {/* Preview Snippet */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                  Snapshot Preview (Sample)
                </span>
                <pre className="p-3 bg-[#111827] text-[#E5E7EB] font-mono text-[11px] rounded-md overflow-x-auto max-h-40 leading-relaxed">
                  {JSON.stringify(
                    {
                      version: 1,
                      exportedAt: new Date().toISOString(),
                      totalEntities: entities.length,
                      sampleEntity: entities[0]
                        ? { id: entities[0].id, name: entities[0].name, x: entities[0].x, y: entities[0].y }
                        : null,
                      customContinentShapesCount: Object.keys(customContinentShapes).length
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          ) : (
            /* IMPORT TAB */
            <div className="space-y-4">
              {/* File Upload Area */}
              <div>
                <label
                  htmlFor={fileInputId}
                  className="border-2 border-dashed border-[#D1D5DB] hover:border-[#2563EB] hover:bg-[#FAF8F5] rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all group"
                >
                  <FileJson className="w-8 h-8 text-[#9CA3AF] group-hover:text-[#2563EB] mb-2 transition-colors" />
                  <span className="text-xs font-semibold text-[#111827] group-hover:text-[#2563EB]">
                    Upload snapshot JSON file
                  </span>
                  <span className="text-[11px] text-[#6B7280] mt-1">
                    Click to browse or drag and drop .json snapshot file
                  </span>
                  <input
                    id={fileInputId}
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Or Paste JSON Text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                    Or Paste JSON Snapshot Directly:
                  </span>
                  {importJsonText && (
                    <button
                      type="button"
                      onClick={() => {
                        setImportJsonText('');
                        setParsedSnapshot(null);
                        setParseError(null);
                      }}
                      className="text-[11px] text-[#DC2626] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    validateAndParseJson(e.target.value);
                  }}
                  placeholder="Paste { &quot;version&quot;: 1, &quot;entities&quot;: [ ... ] } here..."
                  rows={4}
                  className="w-full p-2.5 bg-white border border-[#D1D5DB] rounded-md font-mono text-[11px] text-[#111827] focus:outline-hidden focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
                />
              </div>

              {/* Error message */}
              {parseError && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md flex items-start space-x-2 text-xs text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Success validation preview */}
              {parsedSnapshot && (
                <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-[#16A34A]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Valid Snapshot Loaded</span>
                    </div>
                    <span className="text-[11px] text-[#6B7280]">
                      Exported: {new Date(parsedSnapshot.exportedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-white rounded border border-[#DCFCE7] flex items-center justify-between">
                      <span className="text-[#4B5563]">Entities to Apply:</span>
                      <span className="font-bold text-[#111827]">
                        {matchingEntitiesCount} / {entities.length}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded border border-[#DCFCE7] flex items-center justify-between">
                      <span className="text-[#4B5563]">Archipelago Shapes:</span>
                      <span className="font-bold text-[#111827]">
                        {Object.keys(parsedSnapshot.customContinentShapes || {}).length}
                      </span>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="pt-2 border-t border-[#DCFCE7] space-y-2 text-xs">
                    <span className="font-medium text-[#374151] block text-[11px] uppercase tracking-wider">
                      Import Components:
                    </span>
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={importOptions.applyEntities}
                        onChange={(e) => setImportOptions(prev => ({ ...prev, applyEntities: e.target.checked }))}
                        className="rounded text-[#2563EB]"
                      />
                      <span>Apply entity coordinates (x, y)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={importOptions.applyShapes}
                        onChange={(e) => setImportOptions(prev => ({ ...prev, applyShapes: e.target.checked }))}
                        className="rounded text-[#2563EB]"
                      />
                      <span>Apply archipelago polygon shapes & borders</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={importOptions.applyMetadata}
                        onChange={(e) => setImportOptions(prev => ({ ...prev, applyMetadata: e.target.checked }))}
                        className="rounded text-[#2563EB]"
                      />
                      <span>Apply archipelago quadrants & labels</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Status message */}
              {successMessage && (
                <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-md text-xs text-[#1D4ED8] flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              {parsedSnapshot && (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isApplying}
                    onClick={() => handleApply(false)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-white hover:bg-[#FAF8F5] text-[#111827] border border-[#D1D5DB] hover:border-[#111827] py-2.5 px-4 rounded-md font-medium text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-[#2563EB]" />
                    <span>Apply to Map (Preview Locally)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isApplying}
                    onClick={() => handleApply(true)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2.5 px-4 rounded-md font-medium text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isApplying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Committing to Cloud...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-white" />
                        <span>Apply & Commit to Cloud</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E7EB] bg-[#FAF8F5] flex items-center justify-between text-xs text-[#6B7280]">
          <span>
            {activeTab === 'export'
              ? 'Snapshots can be restored anytime or transferred across environments'
              : 'Applying locally does not consume cloud Firestore quota until you commit'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#374151] hover:text-[#111827] hover:bg-white rounded border border-[#D1D5DB] transition-colors cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
