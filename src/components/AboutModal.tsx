import React from 'react';
import { X, Info, Globe, Network, MapPin, Sparkles } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalEntitiesCount: number;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  totalEntitiesCount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-[4px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-[#FAF8F5] border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-[#FAF8F5] border border-[#E5E7EB] flex items-center justify-center">
              <Info className="w-4 h-4 text-[#111827]" />
            </div>
            <div>
              <h2 
                className="font-cormorant-title text-xl sm:text-2xl text-[#111827]"
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontWeight: 500,
                  lineHeight: 1.02,
                  letterSpacing: '-0.015em',
                  textWrap: 'balance',
                }}
              >
                About Metta Tropical Ecosystem Map
              </h2>
              <p className="font-technical text-[10px] text-[#716C64] uppercase tracking-wider mt-0.5">
                A Living Cartography of Inner, Social, Cultural & Systems Transformation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-[#8C877F] hover:text-[#111827] rounded-[4px] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs font-sans text-[#374151] leading-relaxed">
          {/* Mission */}
          <div className="p-4 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
            <p className="font-editorial text-base text-[#111827] italic leading-snug">
              "Mapping the interconnected ecosystem of organizations, individuals, and initiatives catalyzing deep transformation in service of planetary flourishing."
            </p>
            <p className="mt-2 text-[#6B7280]">
              Currently indexing <span className="font-semibold text-[#111827]">{totalEntitiesCount}</span> entities across diverse bioregions, lineages, and disciplines.
            </p>
          </div>

          {/* The Four Quadrants */}
          <div>
            <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              The Four Cardinal Quadrants
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5B21B6]" />
                  <span className="font-editorial text-xs font-semibold text-[#111827]">Inner Change</span>
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  Contemplative science, psychological development, somatic awareness, and trauma healing building individual groundedness.
                </p>
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#111827]" />
                  <span className="font-editorial text-xs font-semibold text-[#111827]">Social Change</span>
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  Commons stewardship, participatory governance, civic cooperatives, and regenerative community organizing.
                </p>
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7D8764]" />
                  <span className="font-editorial text-xs font-semibold text-[#111827]">Cultural Change</span>
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  Warm Data, transcontextual inquiries, storytelling, art, and indigenous wisdom shifting foundational narratives.
                </p>
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
                  <span className="font-editorial text-xs font-semibold text-[#111827]">Systems Change</span>
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  Planetary boundaries, circular economics, institutional redesign, leverage points, and ecological policy infrastructure.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Guide */}
          <div>
            <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#166534]" />
              Navigating the Cartography
            </h3>
            <ul className="space-y-1.5 text-[11.5px] text-[#4B5563]">
              <li className="flex items-start gap-2">
                <span className="text-[#111827] font-semibold shrink-0">•</span>
                <span><strong>Pan & Zoom:</strong> Drag to reposition the map, scroll to zoom in and out.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#111827] font-semibold shrink-0">•</span>
                <span><strong>Archipelagos:</strong> Toggle the Archipelagos button in the top bar to visualize landmass territories grouping related clusters.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#111827] font-semibold shrink-0">•</span>
                <span><strong>Relationships:</strong> Toggle Relationships to reveal network lines and partnerships connecting organizations and key leaders.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#111827] font-semibold shrink-0">•</span>
                <span><strong>Entity Dossiers:</strong> Click any node on the map or in the directory to inspect detailed field data, warm data, and community notes.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF8F5] border-t border-[#E5E7EB] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-[#E5E7EB] bg-white hover:bg-[#FAF8F5] text-[#111827] text-xs font-sans rounded-[4px] cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
