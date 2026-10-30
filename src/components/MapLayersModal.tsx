import React, { useEffect, useState } from 'react';
import { X, Layers, Check, ExternalLink, ArrowRight, ShieldCheck, Compass } from 'lucide-react';
import { LayerEntityCounts, formatLayerEntitiesBreakdown } from '../utils/layerClassifier';

interface MapLayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 1 | 2 | 3 | 'all';
  activeLayer: 1 | 2 | 3 | 'all';
  onSelectLayer?: (layer: 1 | 2 | 3 | 'all') => void;
  layer1Counts: LayerEntityCounts;
  layer2Counts: LayerEntityCounts;
  layer3Counts: LayerEntityCounts;
}

export const MapLayersModal: React.FC<MapLayersModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'all',
  activeLayer,
  onSelectLayer,
  layer1Counts,
  layer2Counts,
  layer3Counts
}) => {
  const [selectedTab, setSelectedTab] = useState<1 | 2 | 3 | 'all'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setSelectedTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E5E7EB] rounded-[6px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#FAF8F5] border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-[4px] bg-white border border-[#E5E7EB] shadow-2xs flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-[#111827]" />
            </div>
            <div>
              <h2
                className="font-cormorant-title text-xl sm:text-2xl text-[#111827]"
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontWeight: 600,
                  lineHeight: 1.1,
                  letterSpacing: '-0.015em'
                }}
              >
                Map Layers & Architecture
              </h2>
              <p className="font-technical text-[10.5px] text-[#716C64] uppercase tracking-wider mt-0.5">
                Cartographic classification of initiatives responding to the Metacrisis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-[#8C877F] hover:text-[#111827] hover:bg-[#E5E7EB]/50 rounded-[4px] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center px-4 pt-2.5 bg-white border-b border-[#E5E7EB] gap-2 overflow-x-auto font-sans text-xs">
          <button
            type="button"
            onClick={() => setSelectedTab('all')}
            className={`pb-2 px-2.5 font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'all'
                ? 'border-[#111827] text-[#111827] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            All Layers
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab(1)}
            className={`pb-2 px-2.5 font-medium border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              selectedTab === 1
                ? 'border-[#059669] text-[#065F46] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#065F46]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#059669]" />
            <span>Layer 1: Wisdom-Centered</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab(2)}
            className={`pb-2 px-2.5 font-medium border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              selectedTab === 2
                ? 'border-[#2563EB] text-[#1D4ED8] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#1D4ED8]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
            <span>Layer 2: Curated Ecosystem</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab(3)}
            className={`pb-2 px-2.5 font-medium border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              selectedTab === 3
                ? 'border-[#7C3AED] text-[#6D28D9] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#6D28D9]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
            <span>Layer 3: Life-Affirming</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs font-sans text-[#374151] leading-relaxed">
          {/* Layer 1 Section */}
          {(selectedTab === 'all' || selectedTab === 1) && (
            <div className="bg-[#FAFDFB] border border-[#059669]/30 rounded-[5px] p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#059669]/20 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3 h-3 rounded-full bg-[#059669] shadow-xs shrink-0" />
                  <span className="font-editorial text-sm sm:text-base font-bold text-[#065F46]">
                    Layer 1: Wisdom-Centered Responses
                  </span>
                  <span className="font-technical text-[10px] bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] px-2 py-0.5 rounded-[2px] font-medium">
                    {formatLayerEntitiesBreakdown(layer1Counts)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {activeLayer === 1 ? (
                    <span className="text-[10px] font-technical uppercase font-bold px-2 py-0.5 rounded-[2px] bg-[#059669] text-white flex items-center space-x-1 shadow-2xs">
                      <Check className="w-3 h-3" />
                      <span>Active on Map</span>
                    </span>
                  ) : (
                    onSelectLayer && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectLayer(1);
                        }}
                        className="text-[10.5px] font-technical uppercase font-semibold px-2 py-0.5 rounded-[2px] bg-white hover:bg-[#ECFDF5] text-[#065F46] border border-[#059669]/50 transition-colors cursor-pointer shadow-2xs"
                      >
                        Switch to Layer 1
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <h3 className="font-editorial text-sm sm:text-base font-semibold text-[#111827] leading-snug">
                  A Fragmented Ecosystem of Initiatives Contributing to Wisdom-Centered Educational Responses to the Metacrisis
                </h3>
                <p className="mt-1 font-sans text-[11px] font-medium text-[#047857]">
                  The Layer 1 of the Map includes {formatLayerEntitiesBreakdown(layer1Counts)} whose our relationship with ranges from: 1. Core References to 6. Following Closely.
                </p>
              </div>

              {/* Detailed Description */}
              <div className="space-y-2.5 pt-2 border-t border-[#E5E7EB] text-[#374151] leading-relaxed text-[12px]">
                <p>
                  These initiatives are the closest to the spirit of our work, influencing it greatly. They often recognize our civilizational predicament as a metacrisis and have developed wisdom-centered, systems-informed approaches to respond to it.
                </p>
                <p className="text-[#4B5563]">
                  They often operate in some intersection between inner, social, cultural and systems change, and/or stem from regenerative, decolonial, complexity-informed, grassroots background. We believe they're driving important, transformative change and our hope is that, with this map and with our work, they can be, in some way, in closer relationship with each other.
                </p>
              </div>
            </div>
          )}

          {/* Layer 2 Section */}
          {(selectedTab === 'all' || selectedTab === 2) && (
            <div className="bg-[#F8FAFF] border border-[#2563EB]/30 rounded-[5px] p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2563EB]/20 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3 h-3 rounded-full bg-[#2563EB] shadow-xs shrink-0" />
                  <span className="font-editorial text-sm sm:text-base font-bold text-[#1D4ED8]">
                    Layer 2: Curated Transformation
                  </span>
                  <span className="font-technical text-[10px] bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] px-2 py-0.5 rounded-[2px] font-medium">
                    {formatLayerEntitiesBreakdown(layer2Counts)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {activeLayer === 2 ? (
                    <span className="text-[10px] font-technical uppercase font-bold px-2 py-0.5 rounded-[2px] bg-[#2563EB] text-white flex items-center space-x-1 shadow-2xs">
                      <Check className="w-3 h-3" />
                      <span>Active on Map</span>
                    </span>
                  ) : (
                    onSelectLayer && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectLayer(2);
                        }}
                        className="text-[10.5px] font-technical uppercase font-semibold px-2 py-0.5 rounded-[2px] bg-white hover:bg-[#EFF6FF] text-[#1D4ED8] border border-[#2563EB]/50 transition-colors cursor-pointer shadow-2xs"
                      >
                        Switch to Layer 2
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <h3 className="font-editorial text-sm sm:text-base font-semibold text-[#111827] leading-snug">
                  A Curated Ecosystem of Initiatives Working Towards Inner, Social, Cultural and Systems Transformation In Service of Planetary Flourishing
                </h3>
                <p className="mt-1 font-sans text-[11px] font-medium text-[#1D4ED8]">
                  The Layer 2 of the Map includes the {formatLayerEntitiesBreakdown(layer2Counts)} whose our relationship with ranges from: 7: Following -&gt; 9: Aware of.
                </p>
              </div>

              {/* Detailed Description */}
              <div className="space-y-2.5 pt-2 border-t border-[#E5E7EB] text-[#374151] leading-relaxed text-[12px]">
                <p>
                  These are initiatives we follow and are interested in, that seem to be doing important work, but we're still not close enough to have a strong opinion about or to vouch for them as a whole.
                </p>
                <p className="text-[#4B5563]">
                  We might already know and enjoy their work and recommend part of it, in which case we're often attaching recommended resources and comments on their profiles. Our intention is, as we keep learning about them, and as this map is collaboratively tended, gather more data on them, references, opinions and experiences from other people in our network as well.
                </p>
              </div>
            </div>
          )}

          {/* Layer 3 Section */}
          {(selectedTab === 'all' || selectedTab === 3) && (
            <div className="bg-[#FAF9FF] border border-[#7C3AED]/30 rounded-[5px] p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#7C3AED]/20 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3 h-3 rounded-full bg-[#7C3AED] shadow-xs shrink-0" />
                  <span className="font-editorial text-sm sm:text-base font-bold text-[#6D28D9]">
                    Layer 3: Life-Affirming Futures
                  </span>
                  <span className="font-technical text-[10px] bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE] px-2 py-0.5 rounded-[2px] font-medium">
                    {formatLayerEntitiesBreakdown(layer3Counts)}
                  </span>
                </div>

                <span className="text-[10px] font-technical uppercase font-semibold px-2 py-0.5 rounded-[2px] bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
                  Coming Soon • Unclickable for now
                </span>
              </div>

              {/* Title */}
              <div>
                <h3 className="font-editorial text-sm sm:text-base font-semibold text-[#111827] leading-snug">
                  A Wide Range of Initiatives Possibly Working Towards Life-Affirming Futures
                </h3>
                <p className="mt-1 font-sans text-[11px] font-medium text-[#6D28D9]">
                  The Layer 3 of the Map includes {formatLayerEntitiesBreakdown(layer3Counts)}, whose our relationship with are either: 10: Unaware of or 11. Crowdsourced.
                </p>
              </div>

              {/* Detailed Description */}
              <div className="space-y-2.5 pt-2 border-t border-[#E5E7EB] text-[#4B5563] leading-relaxed text-[12px]">
                <p>
                  All the initiatives we've gathered on, who are possibly working towards life-affirming futures. These are entities sourced from other open-source maps or from our initial research, but that we still have very little or no information about.
                </p>
                <p className="text-[#6B7280]">
                  Entities added to this map by non-members of the collective automatically land here upon approval. We intend to review these and learn from these initiatives gradually and then, as we do, move them to the 2nd or 1st layers of the map.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#FAF8F5] border-t border-[#E5E7EB] flex items-center justify-between text-xs font-sans">
          <div className="text-[11px] text-[#716C64] font-technical flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-[#8C877F]" />
            <span>Currently Active: {activeLayer === 'all' ? 'All Combined' : `Layer ${activeLayer}`}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-[#111827] text-white rounded-[4px] font-medium hover:bg-[#1F2937] transition-colors cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
