import React from 'react';
import { X, HelpCircle, Globe, Layers, Network, MapPin, Search, BookOpen, PlusCircle, type LucideIcon } from 'lucide-react';

interface GuideSection {
  title: string;
  Icon: LucideIcon;
  items: { label: string; text: string }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: 'Moving Around the Map',
    Icon: Globe,
    items: [
      { label: 'Pan:', text: 'Click and drag anywhere on the map to move around. On touch screens, drag with one finger or pan with two.' },
      { label: 'Zoom:', text: 'Scroll with the mouse wheel, pinch on touch screens, or use the + and − buttons in the map corner. Zooming follows your cursor, so point at the area you want to explore.' },
      { label: 'Reset View:', text: 'Use the reset button next to the zoom controls to return to the centre of the map. The current zoom level is shown as a percentage beside them.' },
      { label: 'Full Screen:', text: 'Use the expand button in the top bar to hide the browser bar and give the map the whole screen. Press Esc to exit.' },
    ],
  },
  {
    title: 'Map Layers',
    Icon: Layers,
    items: [
      { label: 'Three Layers:', text: 'The map is organised in three layers: Layer 1 (Wisdom-Centered Responses), Layer 2 (Curated Transformation) and Layer 3 (Life-Affirming Futures).' },
      { label: 'Switching Layers:', text: 'Open the Map Layers panel in the left sidebar to switch between layers or view all of them at once. Use Read More to learn what each layer represents.' },
    ],
  },
  {
    title: 'Archipelagos, Fields & Relationships',
    Icon: MapPin,
    items: [
      { label: 'Archipelagos:', text: 'In Layer 1, related entities are grouped into islands called archipelagos, each sitting in one of the map quadrants. Toggle them with the Archipelagos button in the top bar.' },
      { label: 'Fields:', text: 'In Layers 2 and 3, entities are grouped by fields instead. The same top bar button becomes Fields.' },
      { label: 'Exploring a Group:', text: 'Click an archipelago or field on the map, or pick one in the left sidebar, to see its description and the entities that belong to it.' },
      { label: 'Relationships:', text: 'Toggle Relationships in the top bar to draw the connections between organisations, people and ideas. Hovering over or selecting an entity always highlights its direct connections.' },
    ],
  },
  {
    title: 'Entities',
    Icon: Network,
    items: [
      { label: 'Entity Details:', text: 'Click any entity on the map, in the search results or in the Directory to open its details in the right sidebar: description, location, tags, relationships, warm data and community notes.' },
      { label: 'Entity Types:', text: 'The counters in the left sidebar show how many Organizations, People, Ideas and Media are on the map. Click a counter to list those entities.' },
    ],
  },
  {
    title: 'Search & Filters',
    Icon: Search,
    items: [
      { label: 'Search:', text: 'Type in the search bar to find entities by name, tag or location. Use the ↑ and ↓ keys to move through results and Enter to jump to one on the map.' },
      { label: 'General Filters:', text: 'The General tab of the left sidebar filters the map by language, country, biome, operating region, maturity, size, reach and more. Advanced filters cover orientation to change and other assessments.' },
      { label: 'Archipelagos / Fields & Tags:', text: 'The other sidebar tabs let you browse the map by group or narrow it down to entities that share specific tags.' },
      { label: 'Resetting:', text: 'Each filter section has a reset button to clear its filters and bring every entity back.' },
    ],
  },
  {
    title: 'Directory',
    Icon: BookOpen,
    items: [
      { label: 'Card & List Views:', text: 'Open the Directory from the top bar to browse every entity as cards or as a list, with its own search and filters.' },
      { label: 'Locate & Export:', text: 'Use the locate button on any entry to find it on the map, or download the currently filtered entities as a CSV file.' },
    ],
  },
  {
    title: 'Contributing',
    Icon: PlusCircle,
    items: [
      { label: 'Add New:', text: 'Use the Add new button in the top bar to suggest an organization, person, idea or media item. Contributions are reviewed before they appear on the map.' },
      { label: 'Map Changelog:', text: 'Open the changelog on the map to see what has been added or updated in each version.' },
      { label: 'Language:', text: 'Switch between English and Portuguese with the language button in the top bar.' },
    ],
  },
];

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
              <HelpCircle className="w-4 h-4 text-[#111827]" />
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
                How to Use the Metta Tropical Ecosystem Map
              </h2>
              <p className="font-technical text-[10px] text-[#716C64] uppercase tracking-wider mt-0.5">
                A Living Cartography of Spiritual, Social, Cultural & Systems Transformation
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
        <div className="p-4 sm:p-6 space-y-5 max-h-[min(75vh,calc(100dvh-11rem))] overflow-y-auto text-xs font-sans text-[#374151] leading-relaxed">
          {/* Mission */}
          <div className="p-4 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px]">
            <p className="font-editorial text-base text-[#111827] italic leading-snug">
              "Mapping the interconnected ecosystem of organizations, individuals, and initiatives catalyzing deep transformation in service of planetary flourishing."
            </p>
            <p className="mt-2 text-[#6B7280]">
              Currently indexing <span className="font-semibold text-[#111827]">{totalEntitiesCount}</span> entities across diverse bioregions, lineages, and disciplines.
            </p>
          </div>

          {/* How-to Guide */}
          {GUIDE_SECTIONS.map(({ title, Icon, items }) => (
            <div key={title}>
              <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-[#166534]" />
                {title}
              </h3>
              <ul className="space-y-1.5 text-[11.5px] text-[#4B5563]">
                {items.map(({ label, text }) => (
                  <li key={label} className="flex items-start gap-2">
                    <span className="text-[#111827] font-semibold shrink-0">•</span>
                    <span><strong>{label}</strong> <span>{text}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
